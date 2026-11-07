import React from 'react';
import { ChevronRight, Database } from 'lucide-react';
import type { Conversation } from '../../types';

interface EmptyStateProps {
  activeConversation: Conversation | null;
  suggestedQuestions: string[];
  onSelectQuestion: (questionText: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  activeConversation,
  suggestedQuestions,
  onSelectQuestion,
}) => {
  return (
    <div className="my-auto py-12 text-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-sm bg-[#FAF9F6] border border-[#DDD8CB] text-[#C8501E] flex items-center justify-center mx-auto mb-4">
        <Database size={22} />
      </div>
      <h2 className="text-2xl md:text-3xl font-serif text-[#1F1E1B] mb-2 font-normal">
        {activeConversation ? activeConversation.title : 'TableTalk Workbench'}
      </h2>
      <p className="text-xs text-[#6E6A60] max-w-md mx-auto mb-8 leading-relaxed font-sans">
        Select 1 to 5 tables from your data sources on the left and submit questions in natural language. DuckDB runs queries directly in an isolated sandbox.
      </p>

      {/* Suggested Questions Pills */}
      {suggestedQuestions.length > 0 && (
        <div className="space-y-2 text-left">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E6A60] block px-1 font-semibold">
            Suggested Inquiries:
          </span>
          <div className="grid gap-2">
            {suggestedQuestions.map((qText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuestion(qText)}
                className="w-full text-left p-3.5 text-xs font-sans bg-white hover:bg-[#FAF9F6] border border-[#DDD8CB] hover:border-[#6E6A60] rounded text-[#1F1E1B] transition-all flex items-center justify-between group"
              >
                <span>{qText}</span>
                <ChevronRight size={14} className="text-[#6E6A60] group-hover:text-[#1F1E1B] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
