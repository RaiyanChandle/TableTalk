import React from 'react';
import { Sparkles, StopCircle } from 'lucide-react';
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
    <div className="flex gap-3 mb-8 items-start">
      <div className="w-8 h-8 rounded-full bg-[#C8501E] text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse shadow-2xs">
        <Sparkles size={15} />
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
        {/* Live Status Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C8501E] animate-ping" />
            <span className="text-xs font-medium text-slate-800">
              {streamStatus || 'Processing...'}
            </span>
            {streamStep && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                step {streamStep.index} · {streamStep.name}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onStopStream}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
            title="Stop query execution"
          >
            <StopCircle size={13} />
            <span>Stop</span>
          </button>
        </div>

        {/* Streaming Prose */}
        {streamingAnswer && (
          <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed mb-4">
            <p className="whitespace-pre-wrap">{streamingAnswer}</p>
          </div>
        )}

        {/* Streaming SQL */}
        {streamingSql && (
          <div className="mb-4 rounded-md border border-slate-800 bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto">
            <span className="text-[10px] uppercase text-slate-400 block mb-1">Generated SQL:</span>
            <pre className="whitespace-pre-wrap">{streamingSql}</pre>
          </div>
        )}

        {/* Streaming Chart */}
        {streamingChart && <ChartRenderer spec={streamingChart} />}

        {/* Streaming Table */}
        {streamingTable && streamingTable.rows.length > 0 && (
          <div className="mb-4 border border-slate-200 rounded overflow-x-auto max-h-52">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                <tr>
                  {streamingTable.columns.map((c) => (
                    <th key={c} className="p-2 font-mono font-semibold text-slate-700">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {streamingTable.rows.slice(0, 5).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {streamingTable.columns.map((c) => (
                      <td key={c} className="p-2 font-mono text-right text-slate-900">
                        {String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
