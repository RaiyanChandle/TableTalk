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
    <div className="bg-white border-t border-[#DDD8CB] px-6 py-4 shrink-0">
      <div className="max-w-3xl w-full mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative flex items-center bg-[#FAF9F6] border border-[#DDD8CB] focus-within:border-[#1F1E1B] rounded transition-colors"
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
            placeholder={`Ask a question across ${activeTableNames.join(', ')}… (Press Enter)`}
            className="flex-1 py-3 pl-4 pr-12 text-sm bg-transparent text-[#1F1E1B] placeholder-[#6E6A60] focus:outline-none resize-none font-sans"
          />
          <div className="absolute right-2.5 flex items-center">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-1.5 text-[#C8501E] hover:bg-[#FFF8F6] rounded transition-colors"
                title="Stop execution"
              >
                <StopCircle size={18} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="p-1.5 bg-[#1F1E1B] text-white rounded hover:bg-[#C8501E] disabled:bg-[#EFECE4] disabled:text-[#6E6A60] disabled:cursor-not-allowed transition-colors"
                title="Submit inquiry"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-[#6E6A60] px-1">
          <span>Press Enter to send · Shift+Enter for newline</span>
          <span>DuckDB In-Memory Sandbox · Gemini Flash</span>
        </div>
      </div>
    </div>
  );
};
