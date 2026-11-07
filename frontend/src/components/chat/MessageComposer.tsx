import React, { useEffect, useRef } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea to accommodate multiline questions cleanly without clipping
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';
    // Min 44px, Max 180px (approx 6-7 lines before smooth internal scrolling)
    const computedHeight = Math.min(Math.max(el.scrollHeight, 44), 180);
    el.style.height = `${computedHeight}px`;
  }, [question]);

  return (
    <div className="bg-white border-t border-[#DDD8CB] px-4 sm:px-6 py-3.5 shrink-0">
      <div className="max-w-3xl w-full mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="relative bg-[#FAF9F6] border border-[#DDD8CB] focus-within:border-[#C8501E] focus-within:ring-2 focus-within:ring-[#C8501E]/12 rounded-xl transition-all shadow-2xs"
        >
          <textarea
            ref={textareaRef}
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
            placeholder={
              activeTableNames.length > 0
                ? `Ask a question across ${activeTableNames.join(', ')}…`
                : 'Ask a question across your selected datasets…'
            }
            className="w-full pt-3 pb-3 pl-4 pr-14 text-sm bg-transparent text-[#1F1E1B] placeholder-[#8C867A] focus:outline-none resize-none font-sans leading-relaxed overflow-y-auto block"
          />

          {/* Action button anchored at the bottom-right corner with ample clearance */}
          <div className="absolute right-2.5 bottom-2 flex items-center gap-1.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="p-1.5 text-white bg-[#C8501E] hover:bg-[#A93F14] rounded-lg transition-all shadow-xs flex items-center justify-center"
                title="Halt analysis execution"
              >
                <StopCircle size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!question.trim()}
                className="p-1.5 bg-[#1F1E1B] text-white rounded-lg hover:bg-[#C8501E] disabled:bg-[#EFECE4] disabled:text-[#A8A296] disabled:cursor-not-allowed transition-all shadow-2xs hover:shadow-xs active:scale-95 flex items-center justify-center"
                title="Submit query (Enter)"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-[#6E6A60] px-1 select-none">
          <span className="flex items-center gap-1">
            <span>Press</span>
            <kbd className="px-1 py-0.2 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-[10px] text-[#1F1E1B]">Enter</kbd>
            <span>to send ·</span>
            <kbd className="px-1 py-0.2 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-[10px] text-[#1F1E1B]">Shift+Enter</kbd>
            <span>for newline</span>
          </span>
          <span className="hidden sm:inline">DuckDB In-Memory Sandbox · Gemini Flash</span>
        </div>
      </div>
    </div>
  );
};
