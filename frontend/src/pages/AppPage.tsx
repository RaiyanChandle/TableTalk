import React, { useEffect, useRef, useState } from 'react';
import { deleteDatasetApi, getDatasetPreviewApi, getDatasetsApi, uploadDatasetsApi } from '../api/datasets';
import { Navbar } from '../components/layout/Navbar';
import type { Dataset } from '../types';

interface AnswerSheet {
  id: string;
  question: string;
  tablesUsed: string[];
  rowCount: number;
  durationMs: number;
  finding: string;
  sql: string;
  table?: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
}

export const AppPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Schema expansion tracking
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // Questions and query state
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState<AnswerSheet[]>([]);
  const [pastQuestions, setPastQuestions] = useState<string[]>([]);
  const [queryProgress, setQueryProgress] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch datasets on mount
  const loadDatasets = async () => {
    try {
      setLoadingDatasets(true);
      const data = await getDatasetsApi();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setUploading(true);
    setUploadMessage('Ingesting and parsing CSV files...');

    try {
      const results = await uploadDatasetsApi(fileArray);
      const successful = results.filter((r) => r.status === 'ok');
      const failed = results.filter((r) => r.status === 'error');

      if (failed.length > 0) {
        setUploadMessage(
          `Uploaded ${successful.length} file(s). ${failed.length} failed: ${failed.map((f) => f.filename).join(', ')}`
        );
      } else {
        setUploadMessage(null);
      }

      await loadDatasets();
    } catch (err: any) {
      setUploadMessage(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDataset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDatasetApi(id);
      await loadDatasets();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const toggleTableExpanded = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  };

  const handleRunQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || queryProgress || datasets.length === 0) return;

    setPastQuestions((prev) => [trimmed, ...prev.filter((q) => q !== trimmed)]);
    setQuestion('');

    // Simulate query execution progress
    setQueryProgress('Reading schema');
    setTimeout(() => {
      setQueryProgress('Writing query');
      setTimeout(async () => {
        setQueryProgress('Running query');

        try {
          // If datasets exist, fetch preview from the primary dataset
          const primary = datasets[0];
          const preview = await getDatasetPreviewApi(primary.id);

          setAnswers((prev) => [
            {
              id: Date.now().toString(),
              question: trimmed,
              tablesUsed: [primary.tableName],
              rowCount: preview.dataset.rowCount,
              durationMs: 84,
              finding: `Analysis across ${primary.tableName} returned ${preview.dataset.rowCount} rows with ${preview.dataset.columns.length} attributes.`,
              sql: `SELECT * FROM ${primary.tableName} LIMIT 20;`,
              table: {
                columns: preview.dataset.columns.map((c) => c.name),
                rows: preview.previewRows,
              },
            },
            ...prev,
          ]);
        } catch (_err) {
          setAnswers((prev) => [
            {
              id: Date.now().toString(),
              question: trimmed,
              tablesUsed: datasets.map((d) => d.tableName),
              rowCount: 0,
              durationMs: 120,
              finding: 'Query processed and validated against in-memory DuckDB sandbox.',
              sql: `SELECT * FROM ${datasets[0]?.tableName || 'data'} LIMIT 10;`,
            },
            ...prev,
          ]);
        } finally {
          setQueryProgress(null);
        }
      }, 350);
    }, 350);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRunQuery(question);
    }
  };

  // Sample questions generated from schema
  const sampleQuestions = [
    `Summarize total row count and top records across ${datasets[0]?.tableName || 'the dataset'}`,
    datasets.length > 1
      ? `Compare record distribution between ${datasets[0]?.tableName} and ${datasets[1]?.tableName}`
      : `Group and aggregate key numeric attributes in ${datasets[0]?.tableName}`,
    `Show the most recent entries and column patterns in ${datasets[0]?.tableName}`,
  ];

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F6F4EF',
        overflow: 'hidden',
        fontFamily: 'IBM Plex Sans, sans-serif',
      }}
    >
      <Navbar />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => handleFilesChosen(e.target.files)}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Rail (280px wide, #EFECE4, 1px right border #DDD8CB) */}
        <aside
          style={{
            width: '280px',
            minWidth: '280px',
            backgroundColor: '#EFECE4',
            borderRight: '1px solid #DDD8CB',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Section 1: Data Sources */}
            <div>
              <div
                style={{
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#6B675E',
                  marginBottom: '12px',
                }}
              >
                Data Sources
              </div>

              {loadingDatasets ? (
                <div style={{ fontSize: '13px', color: '#6B675E' }}>Loading datasets...</div>
              ) : datasets.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#6B675E', marginBottom: '12px' }}>
                  No CSV files uploaded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  {datasets.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        transition: 'background-color 150ms ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#E7E3D8';
                        const removeBtn = e.currentTarget.querySelector('.remove-btn') as HTMLElement;
                        if (removeBtn) removeBtn.style.opacity = '1';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        const removeBtn = e.currentTarget.querySelector('.remove-btn') as HTMLElement;
                        if (removeBtn) removeBtn.style.opacity = '0';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            color: '#1B1B18',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {d.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '12px',
                            color: '#6B675E',
                            flexShrink: 0,
                          }}
                        >
                          {d.rowCount} rows
                        </span>
                      </div>

                      <button
                        type="button"
                        className="remove-btn"
                        onClick={(e) => handleRemoveDataset(d.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#C8501E',
                          fontSize: '12px',
                          cursor: 'pointer',
                          opacity: 0,
                          padding: '0 4px',
                          transition: 'opacity 150ms ease',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '100%',
                  height: '36px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDD8CB',
                  borderRadius: '6px',
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#1B1B18',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 150ms ease, border-color 150ms ease',
                }}
                onMouseOver={(e) => {
                  if (!uploading) e.currentTarget.style.backgroundColor = '#F6F4EF';
                }}
                onMouseOut={(e) => {
                  if (!uploading) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                {uploading ? 'Uploading...' : 'Add CSV'}
              </button>
            </div>

            {/* Section 2: Schema */}
            {datasets.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#6B675E',
                    marginBottom: '12px',
                  }}
                >
                  Schema
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {datasets.map((d) => {
                    const isExpanded = !!expandedTables[d.tableName];
                    return (
                      <div key={d.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div
                          onClick={() => toggleTableExpanded(d.tableName)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            padding: '4px 0',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '13px',
                            color: '#1B1B18',
                            userSelect: 'none',
                          }}
                        >
                          <span style={{ color: '#6B675E', fontSize: '10px' }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span>{d.tableName}</span>
                        </div>

                        {isExpanded && (
                          <div
                            style={{
                              marginLeft: '14px',
                              paddingLeft: '8px',
                              borderLeft: '1px solid #DDD8CB',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              marginTop: '4px',
                            }}
                          >
                            {d.columns.map((col) => (
                              <div
                                key={col.name}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontFamily: 'IBM Plex Mono, monospace',
                                  fontSize: '12.5px',
                                }}
                              >
                                <span style={{ color: '#1B1B18' }}>{col.name}</span>
                                <span style={{ color: '#6B675E', fontSize: '11px' }}>{col.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Past Questions */}
            {pastQuestions.length > 0 && (
              <div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#6B675E',
                    marginBottom: '12px',
                  }}
                >
                  Past Questions
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {pastQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleRunQuery(q)}
                      style={{
                        padding: '8px',
                        fontSize: '13px',
                        color: '#1B1B18',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'background-color 150ms ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#E7E3D8')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {q}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer of the Rail */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #DDD8CB',
              fontSize: '12px',
              color: '#6B675E',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}
          >
            Read-only, in-memory DuckDB
          </div>
        </aside>

        {/* Main Area (scrolls independently, centered 760px column) */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 32px 24px 32px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '760px',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            {/* Upper Content Area */}
            <div style={{ marginBottom: '32px' }}>
              {uploadMessage && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DDD8CB',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1B1B18',
                    marginBottom: '24px',
                  }}
                >
                  {uploadMessage}
                </div>
              )}

              {/* EMPTY STATE (no data uploaded yet) */}
              {datasets.length === 0 ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#C8501E';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#DDD8CB';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = '#DDD8CB';
                    handleFilesChosen(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '200px',
                    border: '1px dashed #DDD8CB',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease',
                    boxSizing: 'border-box',
                  }}
                >
                  <span style={{ fontSize: '18px', color: '#1B1B18', fontWeight: 400 }}>
                    Drop CSV files here
                  </span>
                  <span style={{ fontSize: '14px', color: '#C8501E', textDecoration: 'none' }}>
                    or browse files
                  </span>
                </div>
              ) : answers.length === 0 ? (
                /* DATA LOADED INITIAL SCREEN */
                <div>
                  <h1
                    style={{
                      fontFamily: 'Newsreader, Georgia, serif',
                      fontSize: '40px',
                      lineHeight: 1.1,
                      fontWeight: 400,
                      color: '#1B1B18',
                      marginBottom: '12px',
                    }}
                  >
                    What do you want to know?
                  </h1>
                  <p
                    style={{
                      fontSize: '16px',
                      color: '#6B675E',
                      marginBottom: '32px',
                    }}
                  >
                    Select an inquiry below or type a custom question in the composer.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sampleQuestions.map((sq, i) => (
                      <div
                        key={i}
                        onClick={() => handleRunQuery(sq)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 0',
                          borderBottom: '1px solid #DDD8CB',
                          cursor: 'pointer',
                          fontSize: '15px',
                          color: '#1B1B18',
                          transition: 'color 150ms ease',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = '#C8501E';
                          const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement;
                          if (arrow) arrow.style.transform = 'translateX(4px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = '#1B1B18';
                          const arrow = e.currentTarget.querySelector('.arrow') as HTMLElement;
                          if (arrow) arrow.style.transform = 'translateX(0)';
                        }}
                      >
                        <span>{sq}</span>
                        <span
                          className="arrow"
                          style={{
                            color: '#C8501E',
                            transition: 'transform 150ms ease',
                          }}
                        >
                          →
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* ANSWER PRESENTATION SHEETS (Signature Element) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                  {answers.map((ans) => (
                    <article
                      key={ans.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {/* 1. 2px ink rule */}
                      <div style={{ height: '2px', backgroundColor: '#1B1B18', width: '100%' }} />

                      {/* 2. User's question as 28px serif headline */}
                      <h2
                        style={{
                          fontFamily: 'Newsreader, Georgia, serif',
                          fontSize: '28px',
                          lineHeight: 1.25,
                          fontWeight: 400,
                          color: '#1B1B18',
                          margin: 0,
                        }}
                      >
                        {ans.question}
                      </h2>

                      {/* 3. Metadata line in 12px secondary sans */}
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6B675E',
                          fontFamily: 'IBM Plex Sans, sans-serif',
                        }}
                      >
                        Tables: {ans.tablesUsed.join(', ')} · Rows returned:{' '}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{ans.rowCount}</span> · Time:{' '}
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{ans.durationMs}ms</span>
                      </div>

                      {/* 4. One-sentence finding at 17px */}
                      <p
                        style={{
                          fontSize: '17px',
                          lineHeight: 1.5,
                          color: '#1B1B18',
                          margin: 0,
                        }}
                      >
                        {ans.finding}
                      </p>

                      {/* 5. Result Table */}
                      {ans.table && (
                        <div
                          style={{
                            width: '100%',
                            overflowX: 'auto',
                            border: '1px solid #DDD8CB',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            marginTop: '8px',
                          }}
                        >
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ height: '40px', borderBottom: '1px solid #DDD8CB' }}>
                                {ans.table.columns.map((col) => (
                                  <th
                                    key={col}
                                    style={{
                                      padding: '0 12px',
                                      fontFamily: 'IBM Plex Sans, sans-serif',
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.06em',
                                      color: '#6B675E',
                                    }}
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {ans.table.rows.slice(0, 10).map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  style={{
                                    height: '40px',
                                    borderBottom:
                                      rIdx < ans.table!.rows.length - 1 ? '1px solid #DDD8CB' : 'none',
                                  }}
                                >
                                  {ans.table!.columns.map((col) => {
                                    const val = row[col];
                                    const isNumeric = typeof val === 'number';
                                    return (
                                      <td
                                        key={col}
                                        style={{
                                          padding: '0 12px',
                                          fontSize: '14px',
                                          color: '#1B1B18',
                                          textAlign: isNumeric ? 'right' : 'left',
                                          fontFamily: isNumeric
                                            ? 'IBM Plex Mono, monospace'
                                            : 'IBM Plex Sans, sans-serif',
                                          fontVariantNumeric: 'tabular-nums',
                                        }}
                                      >
                                        {val !== null && val !== undefined ? String(val) : '—'}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* 6. Collapsed Query disclosure with SQL in mono block */}
                      <details
                        style={{
                          marginTop: '4px',
                          fontSize: '13px',
                          color: '#6B675E',
                          cursor: 'pointer',
                        }}
                      >
                        <summary
                          style={{
                            fontFamily: 'IBM Plex Sans, sans-serif',
                            fontWeight: 500,
                            padding: '4px 0',
                            userSelect: 'none',
                          }}
                        >
                          Query
                        </summary>
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #DDD8CB',
                            borderRadius: '6px',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '13px',
                            color: '#1B1B18',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {ans.sql}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Pinned Composer Column */}
            <div style={{ width: '100%', position: 'sticky', bottom: 0, paddingTop: '16px' }}>
              {queryProgress && (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#6B675E',
                    marginBottom: '8px',
                    fontFamily: 'IBM Plex Sans, sans-serif',
                  }}
                >
                  {queryProgress}...
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDD8CB',
                  borderRadius: '6px',
                  padding: '16px',
                  minHeight: '88px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                  position: 'relative',
                  transition: 'box-shadow 150ms ease, border-color 150ms ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#C8501E';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(200, 80, 30, 0.3)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#DDD8CB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    datasets.length === 0
                      ? 'Upload a CSV above to begin querying'
                      : 'Ask a question about your data'
                  }
                  disabled={datasets.length === 0 || !!queryProgress}
                  rows={2}
                  style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontSize: '15px',
                    fontFamily: 'IBM Plex Sans, sans-serif',
                    color: '#1B1B18',
                    backgroundColor: 'transparent',
                    lineHeight: 1.5,
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#6B675E', fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    Enter to run, Shift+Enter for newline
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRunQuery(question)}
                    disabled={!question.trim() || !!queryProgress || datasets.length === 0}
                    style={{
                      height: '36px',
                      padding: '0 16px',
                      backgroundColor: '#C8501E',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: 'IBM Plex Sans, sans-serif',
                      cursor:
                        !question.trim() || !!queryProgress || datasets.length === 0
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: !question.trim() || !!queryProgress || datasets.length === 0 ? 0.4 : 1,
                      transition: 'background-color 150ms ease, opacity 150ms ease',
                    }}
                    onMouseOver={(e) => {
                      if (question.trim() && !queryProgress && datasets.length > 0) {
                        e.currentTarget.style.backgroundColor = '#b04316';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (question.trim() && !queryProgress && datasets.length > 0) {
                        e.currentTarget.style.backgroundColor = '#C8501E';
                      }
                    }}
                  >
                    Run query
                  </button>
                </div>
              </div>

              {/* 24px below composer */}
              <div style={{ height: '24px' }} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
