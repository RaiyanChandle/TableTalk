import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
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
    <div className="my-auto py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-[#C8501E] flex items-center justify-center mx-auto mb-4 shadow-2xs">
        <Sparkles size={24} />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 mb-2">
        {activeConversation ? activeConversation.title : 'Ask questions across your data'}
      </h2>
      <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
        The agent inspects table relations, writes single-statement DuckDB SQL queries, executes them in your sandbox, and creates charts.
      </p>

      {/* Suggested Questions Pills */}
      {suggestedQuestions.length > 0 && (
        <div className="max-w-xl mx-auto space-y-2 text-left">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block px-1">
            Suggested Inquiries:
          </span>
          <div className="grid gap-2">
            {suggestedQuestions.map((qText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectQuestion(qText)}
                className="w-full text-left p-3 text-xs font-medium bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 transition-all flex items-center justify-between group shadow-2xs"
              >
                <span>{qText}</span>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-700" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
