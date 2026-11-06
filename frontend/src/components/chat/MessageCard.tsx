import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, ChevronDown, ChevronRight, Copy, Download, Database, Clock, Layers } from 'lucide-react';
import type { Message } from '../../types';
import { ChartRenderer } from './ChartRenderer';
import { exportTableAsCsv } from '../../utils/exportCsv';

interface MessageCardProps {
  message: Message;
  tablesUsed?: string[];
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, tablesUsed = [] }) => {
  const [showSql, setShowSql] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="mb-6 pt-4 border-t-2 border-[#22201D]">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#6B665D]">
            User Inquiry
          </span>
          <span className="text-[11px] font-mono text-[#6B665D]">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-serif font-normal text-[#22201D] leading-tight">
          {message.content}
        </h2>
      </div>
    );
  }

  // Assistant answer sheet
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

  return (
    <div className="mb-12 bg-white border border-[#DDD8CB] p-6 shadow-none">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDD8CB] pb-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-[#EFECE4] text-[#22201D] border border-[#DDD8CB]">
            <Database size={11} className="text-[#C8501E]" />
            <span>Analytical Finding</span>
          </span>

          {tablesUsed.map((tbl) => (
            <span
              key={tbl}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-[#F6F4EF] text-[#6B665D] border border-[#DDD8CB]"
            >
              <Layers size={10} />
              <span>{tbl}</span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6B665D]">
          {message.tablePreview && (
            <span>
              {message.tablePreview.rowCount ?? message.tablePreview.rows.length} rows
              {message.tablePreview.truncated ? ' (truncated)' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </div>

      {/* Error state */}
      {message.error && (
        <div className="p-3 mb-4 bg-[#FBF0EE] border border-[#F3C3BC] text-[#8C2314] text-xs font-sans">
          <p className="font-semibold mb-1">Execution Interrupted</p>
          <p>{message.error}</p>
        </div>
      )}

      {/* Answer prose / Markdown */}
      <div className="prose prose-sm max-w-none text-[#22201D] font-sans text-sm leading-relaxed mb-6">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>

      {/* Collapsible SQL Disclosure Drawer */}
      {message.sql && (
        <div className="mb-6 border border-[#DDD8CB] bg-[#F6F4EF]">
          <div
            onClick={() => setShowSql(!showSql)}
            className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-[#EFECE4] transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#22201D]">
              {showSql ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Executed SQL Query</span>
            </div>
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6B665D] hover:text-[#22201D] px-2 py-0.5 bg-white border border-[#DDD8CB]"
            >
              {copiedSql ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
              <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          {showSql && (
            <div className="p-3 border-t border-[#DDD8CB] bg-[#22201D] text-[#EFECE4] overflow-x-auto text-xs font-mono">
              <pre className="whitespace-pre-wrap leading-relaxed">{message.sql}</pre>
            </div>
          )}
        </div>
      )}

      {/* Chart visualization */}
      {message.chartSpec && <ChartRenderer spec={message.chartSpec} />}

      {/* Data Table Preview */}
      {message.tablePreview && message.tablePreview.rows.length > 0 && (
        <div className="mt-6 border border-[#DDD8CB]">
          <div className="flex items-center justify-between px-3 py-2 bg-[#F6F4EF] border-b border-[#DDD8CB]">
            <span className="text-xs font-mono text-[#6B665D] uppercase tracking-wider">
              Result Sample ({message.tablePreview.rows.length} rows previewed)
            </span>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-[#6B665D] hover:text-[#22201D] bg-white border border-[#DDD8CB] hover:bg-[#EFECE4] transition-colors"
              title="Download entire result table as CSV"
            >
              <Download size={12} />
              <span>CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#EFECE4] sticky top-0 border-b border-[#DDD8CB]">
                <tr>
                  {message.tablePreview.columns.map((col) => (
                    <th key={col} className="p-2 font-mono text-[#22201D] font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {message.tablePreview.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#DDD8CB] hover:bg-[#F6F4EF] transition-colors">
                    {message.tablePreview!.columns.map((col) => {
                      const val = row[col];
                      const isNumeric = typeof val === 'number';
                      return (
                        <td
                          key={col}
                          className={`p-2 whitespace-nowrap ${
                            isNumeric ? 'font-mono text-right' : 'font-sans'
                          } text-[#22201D]`}
                        >
                          {val === null || val === undefined ? (
                            <span className="text-[#6B665D] italic">null</span>
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

