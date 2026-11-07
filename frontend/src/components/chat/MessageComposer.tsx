import React from 'react';
import { ArrowUp, StopCircle } from 'lucide-react';

interface MessageComposerProps {
  question: string;
  setQuestion: (q: string) => void;
  isStreaming: boolean;
  activeTableNames: string[];
  onSubmit: () => void;
  onStop: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  question,
  setQuestion,
  isStreaming,
  activeTableNames,
  onSubmit,
  onStop,
}) => {
  return (
    <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0 shadow-xs">
      <div className="max-w-3xl w-full mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative flex items-center bg-slate-50 border border-slate-300 focus-within:border-slate-800 rounded-lg transition-colors shadow-2xs"
        >
          <textarea
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            disabled={isStreaming}
            placeholder={`Ask a question about ${activeTableNames.join(', ')}…`}
            className="flex-1 py-3 pl-4 pr-12 text-sm bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
          />
          <div className="absolute right-2.5 flex items-center">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Stop execution"
              >
                <StopCircle size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="p-1.5 bg-slate-900 text-white rounded-md hover:bg-[#C8501E] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow-2xs"
                title="Submit query"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
          <span>Enter to send · Shift+Enter for new line</span>
          <span>DuckDB Sandbox · Gemini Flash</span>
        </div>
      </div>
    </div>
  );
};
