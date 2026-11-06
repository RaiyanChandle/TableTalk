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
  User as UserIcon,
  AlertTriangle,
  Info,
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

  // User Message
  if (message.role === 'user') {
    return (
      <div className="flex gap-3 mb-6 items-start">
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
          <UserIcon size={15} />
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-800">You asked</span>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-900 leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Message
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

  // Clean error detector
  const isApiKeyError =
    message.error?.includes('API_KEY_INVALID') ||
    message.error?.includes('API key not valid') ||
    message.content?.includes('API key not valid');

  return (
    <div className="flex gap-3 mb-8 items-start">
      <div className="w-8 h-8 rounded-full bg-[#C8501E] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
        <Sparkles size={15} />
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        {/* Top Header & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-800 mr-1">AI Analyst</span>
            {tablesUsed.map((tbl) => (
              <span
                key={tbl}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono bg-slate-50 text-slate-600 rounded border border-slate-200"
              >
                <Layers size={10} className="text-[#C8501E]" />
                <span>{tbl}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            {message.tablePreview && (
              <span>
                {message.tablePreview.rowCount ?? message.tablePreview.rows.length} rows
                {message.tablePreview.truncated ? ' (capped)' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={11} />
              <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
          </div>
        </div>

        {/* Friendly Error Display if API Key Missing or Execution Failed */}
        {isApiKeyError ? (
          <div className="p-3.5 mb-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
            <div className="flex items-center gap-2 font-semibold mb-1 text-amber-900">
              <AlertTriangle size={15} className="text-amber-600" />
              <span>Gemini API Key Required</span>
            </div>
            <p className="leading-relaxed">
              Google Gemini returned an invalid API key error. Please set a valid <strong>GOOGLE_API_KEY</strong> from Google AI Studio inside <code>backend/.env</code> and restart your backend.
            </p>
          </div>
        ) : message.error ? (
          <div className="p-3.5 mb-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-xs">
            <div className="flex items-center gap-2 font-semibold mb-1 text-red-900">
              <AlertTriangle size={15} className="text-red-600" />
              <span>Analysis Stopped</span>
            </div>
            <p className="leading-relaxed font-mono">{message.error}</p>
          </div>
        ) : null}

        {/* Answer Content */}
        {!isApiKeyError && (
          <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed mb-4">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Actions Bar: Show SQL & View Trace */}
        <div className="flex flex-wrap items-center gap-2 mb-4 pt-1">
          {message.sql && (
            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            >
              {showSql ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span>Show SQL</span>
            </button>
          )}

          {message.runId && (
            <button
              type="button"
              onClick={() => setShowTrace(!showTrace)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
            >
              <Info size={13} />
              <span>{showTrace ? 'Hide trace' : 'View trace'}</span>
            </button>
          )}
        </div>

        {/* Collapsible SQL Block */}
        {showSql && message.sql && (
          <div className="mb-4 rounded-md border border-slate-800 bg-slate-900 text-slate-100 overflow-hidden text-xs font-mono">
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700">
              <span className="text-[11px] text-slate-400">DuckDB SQL Query</span>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
              >
                {copiedSql ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                <span>{copiedSql ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {message.sql}
            </pre>
          </div>
        )}

        {/* Collapsible Trace Drawer */}
        {showTrace && message.runId && (
          <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-600">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-200">
              <span className="font-semibold text-slate-700">Run Log Trace</span>
              <span className="text-[10px] text-slate-400">ID: {message.runId}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Executed in locked in-memory DuckDB sandbox (memory cap 512MB, timeout 5000ms). Full audit trace captured in MongoDB.
            </p>
          </div>
        )}

        {/* Chart Visualization */}
        {message.chartSpec && <ChartRenderer spec={message.chartSpec} />}

        {/* Data Table Preview */}
        {message.tablePreview && message.tablePreview.rows.length > 0 && (
          <div className="mt-4 border border-slate-200 rounded-md overflow-hidden bg-white">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200">
              <span className="text-xs font-medium text-slate-600">
                Result Preview ({message.tablePreview.rows.length} rows)
              </span>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded shadow-2xs transition-colors"
                title="Download table data as CSV"
              >
                <Download size={12} />
                <span>Download CSV</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100/75 sticky top-0 border-b border-slate-200">
                  <tr>
                    {message.tablePreview.columns.map((col) => (
                      <th key={col} className="p-2.5 font-mono text-slate-700 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {message.tablePreview.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {message.tablePreview!.columns.map((col) => {
                        const val = row[col];
                        const isNumeric = typeof val === 'number';
                        return (
                          <td
                            key={col}
                            className={`p-2.5 whitespace-nowrap ${
                              isNumeric ? 'font-mono text-right text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-slate-400 italic">null</span>
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
    </div>
  );
};
