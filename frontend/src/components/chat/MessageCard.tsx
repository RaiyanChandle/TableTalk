import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Layers,
  Sparkles,
  AlertTriangle,
  Info,
  Code,
} from 'lucide-react';
import type { Message } from '../../types';
import { ChartRenderer } from './ChartRenderer';
import { exportTableAsCsv } from '../../utils/exportCsv';

interface MessageCardProps {
  message: Message;
  tablesUsed?: string[];
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, tablesUsed = [] }) => {
  const [showSql, setShowSql] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // User Message: Rendered as the Inquiry Section of an Editorial Report Sheet
  if (message.role === 'user') {
    return (
      <div className="mb-4 pt-6 first:pt-2">
        <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[#1F1E1B]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#C8501E]">
              User Inquiry
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#6E6A60]">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-serif text-[#1F1E1B] leading-snug">
          {message.content}
        </h2>
      </div>
    );
  }

  // Assistant Message: Rendered as the Analytical Finding Sheet
  const handleCopySql = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.sql) {
      navigator.clipboard.writeText(message.sql);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  const handleDownloadCsv = () => {
    if (!message.tablePreview) return;
    const safeTitle = `query_result_${message.runId || Date.now()}`;
    exportTableAsCsv(safeTitle, message.tablePreview.columns, message.tablePreview.rows);
  };

  const isApiKeyError =
    message.error?.includes('API_KEY_INVALID') ||
    message.error?.includes('API key not valid') ||
    message.content?.includes('API key not valid');

  return (
    <div className="mb-8 bg-white border border-[#DDD8CB] p-5 md:p-6 transition-all">
      {/* Top Header & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#DDD8CB]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1F1E1B] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#C8501E]" />
            Analytical Finding
          </span>
          {tablesUsed.map((tbl) => (
            <span
              key={tbl}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-[#FAF9F6] text-[#1F1E1B] rounded border border-[#DDD8CB]"
            >
              <Layers size={10} className="text-[#C8501E]" />
              <span>{tbl}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6E6A60]">
          {message.tablePreview && (
            <span>
              {message.tablePreview.rowCount ?? message.tablePreview.rows.length} rows
              {message.tablePreview.truncated ? ' (capped)' : ''}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Structured Error State Banner */}
      {message.error ? (
        <div className="p-4 mb-4 bg-[#FFF8F6] border border-[#F3D5CC] rounded text-xs text-[#9C2D12]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-[#C8501E]" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block mb-1">Execution Interrupted</span>
              <p className="font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                {message.error}
              </p>
              {isApiKeyError && (
                <div className="mt-2 text-[11px] text-[#6E6A60] bg-white p-2.5 rounded border border-[#DDD8CB]">
                  <strong>Action Required:</strong> Set a valid Google Gemini API Key in your <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#DDD8CB]">backend/.env</code> file as <code className="bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#DDD8CB]">GOOGLE_API_KEY</code>.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Finding Prose (Markdown rendered) */}
      {message.content && (
        <div className="prose prose-sm max-w-none text-[#1F1E1B] leading-relaxed mb-5 font-sans">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-[14px]">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-[13px]">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-[13px]">{children}</ol>,
              strong: ({ children }) => <strong className="font-semibold text-[#1F1E1B]">{children}</strong>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 font-mono text-xs bg-[#FAF9F6] text-[#C8501E] rounded border border-[#DDD8CB]">
                  {children}
                </code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      )}

      {/* Interactive Tool Actions Toolbar: [Show SQL] [View Trace] */}
      {(message.sql || message.runId) && (
        <div className="flex flex-wrap items-center gap-2 mb-4 pt-3 border-t border-[#DDD8CB]">
          {message.sql && (
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#1F1E1B] border border-[#DDD8CB] rounded transition-colors"
            >
              <Code size={12} className="text-[#C8501E]" />
              <span>{showSql ? 'Hide SQL' : 'Show SQL'}</span>
              {showSql ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}

          {message.runId && (
            <button
              type="button"
              onClick={() => setShowTrace(!showTrace)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-[#FAF9F6] hover:bg-[#EFECE4] text-[#6E6A60] border border-[#DDD8CB] rounded transition-colors"
            >
              <Info size={12} />
              <span>{showTrace ? 'Hide Trace' : 'View Trace'}</span>
              {showTrace ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          )}

          {message.tablePreview && (
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-[#6E6A60] hover:text-[#1F1E1B] bg-white hover:bg-[#FAF9F6] border border-[#DDD8CB] rounded transition-colors ml-auto"
              title="Download results as CSV"
            >
              <Download size={12} />
              <span>Download CSV</span>
            </button>
          )}
        </div>
      )}

      {/* Collapsible SQL Query Drawer */}
      {showSql && message.sql && (
        <div className="mb-4 rounded border border-[#1F1E1B] bg-[#1A1915] text-[#FAF9F6] p-3 text-xs font-mono overflow-x-auto relative group">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 text-[10px] text-stone-400 uppercase tracking-wider">
            <span>Executed DuckDB Query</span>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded transition-colors"
            >
              {copiedSql ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copiedSql ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed text-emerald-300">{message.sql}</pre>
        </div>
      )}

      {/* Collapsible Audit Run Trace Drawer */}
      {showTrace && message.runId && (
        <div className="mb-4 p-3.5 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-xs font-mono space-y-1.5 text-[#6E6A60]">
          <div className="flex items-center justify-between font-semibold text-[#1F1E1B] pb-1 border-b border-[#DDD8CB]">
            <span>Audit Run Log</span>
            <span className="text-[10px] font-normal">{message.runId}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-[#6E6A60]">Engine:</span> DuckDB Sandbox (Isolated)
            </div>
            <div>
              <span className="text-[#6E6A60]">Model:</span> Gemini Flash
            </div>
          </div>
        </div>
      )}

      {/* Visual Chart Presentation */}
      {message.chartSpec && (
        <div className="my-4">
          <ChartRenderer spec={message.chartSpec} />
        </div>
      )}

      {/* Analytical Result Table Preview (Max 20 rows per design.md) */}
      {message.tablePreview && message.tablePreview.rows && message.tablePreview.rows.length > 0 && (
        <div className="mt-4 border border-[#DDD8CB] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[#FAF9F6] border-b border-[#DDD8CB] text-xs">
            <span className="font-mono text-[#6E6A60] text-[11px]">
              Displaying {Math.min(20, message.tablePreview.rows.length)} of {message.tablePreview.rowCount ?? message.tablePreview.rows.length} rows
            </span>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="text-[11px] font-mono text-[#C8501E] hover:underline flex items-center gap-1"
            >
              <Download size={11} />
              <span>Export RFC 4180 CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF9F6] sticky top-0 border-b border-[#DDD8CB]">
                <tr>
                  {message.tablePreview.columns.map((colName) => (
                    <th
                      key={colName}
                      className="px-3 py-2 font-mono font-medium text-[#1F1E1B] text-[11px] border-r border-[#DDD8CB] last:border-r-0 whitespace-nowrap"
                    >
                      {colName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE7DD] bg-white">
                {message.tablePreview.rows.slice(0, 20).map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[#FAF9F6] transition-colors">
                    {message.tablePreview!.columns.map((colName) => {
                      const val = row[colName];
                      const isNumeric = typeof val === 'number';
                      return (
                        <td
                          key={colName}
                          className={`px-3 py-1.5 font-mono text-[11px] text-[#1F1E1B] border-r border-[#EBE7DD] last:border-r-0 whitespace-nowrap ${
                            isNumeric ? 'text-right' : 'text-left'
                          }`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-[#6E6A60] italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
