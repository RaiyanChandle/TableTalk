import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { getReportApi, getReportDownloadUrl } from '../../api/conversations';
import type { AnalysisReport, Conversation } from '../../types';

interface ReportViewProps {
  activeConversation: Conversation | null;
  activeTableNames: string[];
  messages: any[];
  onReturnToChat: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  activeConversation,
  onReturnToChat,
}) => {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!activeConversation) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getReportApi(activeConversation.id);
      setReport(data);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err?.message || 'Failed to generate living analysis report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <div className="p-8 text-center text-xs font-mono text-[#6E6A60]">
        No active conversation selected to generate report.
      </div>
    );
  }

  return (
    <div className="w-full pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#DDD8CB]">
        <button
          type="button"
          onClick={onReturnToChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#1F1E1B] bg-white hover:bg-[#FAF9F6] border border-[#DDD8CB] rounded transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Return to Chat</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#6E6A60] hover:text-[#1F1E1B] bg-white hover:bg-[#FAF9F6] border border-[#DDD8CB] rounded transition-colors"
            title="Refresh living audit doc"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <a
            href={getReportDownloadUrl(activeConversation.id)}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-medium text-white bg-[#1F1E1B] hover:bg-[#C8501E] rounded transition-colors shadow-2xs"
            title="Download full Markdown audit report"
          >
            <Download size={13} />
            <span>Download .md</span>
          </a>
        </div>
      </div>

      {loading && !report ? (
        <div className="p-12 text-center text-xs font-mono text-[#6E6A60]">
          <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-[#C8501E]" />
          <span>Assembling deterministic living report from stored traces…</span>
        </div>
      ) : error ? (
        <div className="p-5 bg-[#FFF8F6] border border-[#F3D5CC] rounded text-xs text-[#9C2D12]">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertCircle size={15} />
            <span>Report Generation Error</span>
          </div>
          <p className="font-mono text-[11px]">{error}</p>
        </div>
      ) : report ? (
        <div>
          {/* Executive Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-8">
            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                Questions
              </span>
              <span className="text-xl font-serif font-bold text-[#1F1E1B]">
                {report.stats.totalQuestions}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                SQL Queries
              </span>
              <span className="text-xl font-serif font-bold text-[#1F1E1B]">
                {report.stats.totalSqlAttempts}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                Success Rate
              </span>
              <span className="text-xl font-serif font-bold text-emerald-700">
                {report.stats.successRate}%
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                Avg Latency
              </span>
              <span className="text-xl font-serif font-bold text-[#1F1E1B]">
                {report.stats.avgLatencyMs}ms
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                Total Tokens
              </span>
              <span className="text-xl font-serif font-bold text-[#1F1E1B]">
                {report.stats.totalTokens.total.toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDD8CB] rounded">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block mb-1">
                Charts Built
              </span>
              <span className="text-xl font-serif font-bold text-[#C8501E]">
                {report.stats.chartsCount}
              </span>
            </div>
          </div>

          {/* Living Document Sheet */}
          <div className="bg-white border border-[#DDD8CB] p-6 sm:p-8 md:p-12 shadow-sm font-sans text-[#1F1E1B] max-w-4xl mx-auto rounded-lg">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1E1B] pb-3 mb-4 border-b-2 border-[#1F1E1B]">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1F1E1B] mt-8 mb-3 pb-1 border-b border-[#DDD8CB]">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-mono uppercase tracking-wider font-semibold text-[#C8501E] mt-6 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-[14px] leading-relaxed text-[#1F1E1B] mb-3">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 mb-4 space-y-1.5 text-[13px] text-[#1F1E1B]">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-[13px] text-[#1F1E1B]">{children}</ol>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-[#C8501E] pl-3 py-1.5 my-3 bg-[#FAF9F6] text-xs font-mono text-[#5C5549] rounded-r">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="my-5 overflow-x-auto border border-[#DDD8CB] rounded-md max-w-full shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-[#FAF9F6] border-b border-[#DDD8CB] text-[#1F1E1B]">
                      {children}
                    </thead>
                  ),
                  tbody: ({ children }) => (
                    <tbody className="divide-y divide-[#EBE7DD] bg-white">
                      {children}
                    </tbody>
                  ),
                  tr: ({ children }) => (
                    <tr className="hover:bg-[#FAF9F6]/60 transition-colors">
                      {children}
                    </tr>
                  ),
                  th: ({ children }) => (
                    <th className="px-3.5 py-2.5 text-[11px] font-semibold text-[#1F1E1B] border-r border-[#DDD8CB] last:border-r-0 whitespace-nowrap font-mono">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3.5 py-2 text-[12px] border-r border-[#EBE7DD] last:border-r-0 text-[#2B2723]">
                      {children}
                    </td>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 font-mono text-[11px] bg-[#FAF9F6] text-[#C8501E] rounded border border-[#DDD8CB] break-words">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="p-4 my-4 bg-[#1A1915] text-emerald-300 rounded border border-[#2B231D] text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-xs">
                      {children}
                    </pre>
                  ),
                  hr: () => (
                    <hr className="my-6 border-t border-[#DDD8CB]" />
                  ),
                }}
              >
                {report.markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
