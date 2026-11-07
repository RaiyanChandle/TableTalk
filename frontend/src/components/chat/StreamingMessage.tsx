import React from 'react';
import { StopCircle } from 'lucide-react';
import { ChartRenderer } from './ChartRenderer';
import type { ChartSpec, TablePreview } from '../../types';

interface StreamingMessageProps {
  streamStatus: string | null;
  streamStep: { index: number; name: string; status: string } | null;
  streamingAnswer: string;
  streamingSql: string | null;
  streamingTable: TablePreview | null;
  streamingChart: ChartSpec | null;
  onStopStream: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  streamStatus,
  streamStep,
  streamingAnswer,
  streamingSql,
  streamingTable,
  streamingChart,
  onStopStream,
}) => {
  return (
    <div className="mb-8 bg-white border border-[#DDD8CB] p-5 md:p-6 transition-all">
      {/* Live Status Bar */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#DDD8CB]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C8501E] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C8501E]"></span>
          </span>
          <span className="text-xs font-mono font-medium text-[#1F1E1B]">
            {streamStatus || 'Executing analysis…'}
          </span>
          {streamStep && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-[#6E6A60]">
              step {streamStep.index} · {streamStep.name}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onStopStream}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-[#C8501E] hover:bg-[#FFF8F6] border border-[#F3D5CC] rounded transition-colors"
          title="Halt active query execution"
        >
          <StopCircle size={13} />
          <span>Stop</span>
        </button>
      </div>

      {/* Streaming Answer Prose */}
      {streamingAnswer && (
        <div className="prose prose-sm max-w-none text-[#1F1E1B] leading-relaxed mb-4 font-sans">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{streamingAnswer}</p>
        </div>
      )}

      {/* Streaming Live SQL */}
      {streamingSql && (
        <div className="mb-4 rounded border border-[#1F1E1B] bg-[#1A1915] text-[#FAF9F6] p-3 text-xs font-mono overflow-x-auto">
          <span className="text-[10px] uppercase text-stone-400 block mb-1">Generated DuckDB Query:</span>
          <pre className="whitespace-pre-wrap leading-relaxed text-emerald-300">{streamingSql}</pre>
        </div>
      )}

      {/* Streaming Chart */}
      {streamingChart && (
        <div className="my-4">
          <ChartRenderer spec={streamingChart} />
        </div>
      )}

      {/* Streaming Table */}
      {streamingTable && streamingTable.rows.length > 0 && (
        <div className="mt-4 border border-[#DDD8CB] overflow-hidden">
          <div className="px-3 py-1.5 bg-[#FAF9F6] border-b border-[#DDD8CB] text-xs font-mono text-[#6E6A60]">
            Streaming Result Preview ({streamingTable.rows.length} rows)
          </div>
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF9F6] sticky top-0 border-b border-[#DDD8CB]">
                <tr>
                  {streamingTable.columns.map((c) => (
                    <th key={c} className="px-3 py-2 font-mono font-medium text-[#1F1E1B] text-[11px] border-r border-[#DDD8CB] last:border-r-0 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE7DD] bg-white">
                {streamingTable.rows.slice(0, 10).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {streamingTable.columns.map((c) => (
                      <td key={c} className="px-3 py-1.5 font-mono text-[11px] text-[#1F1E1B] border-r border-[#EBE7DD] last:border-r-0 whitespace-nowrap text-right">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
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
