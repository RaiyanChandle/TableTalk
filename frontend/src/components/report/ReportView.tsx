import React from 'react';
import { FileText } from 'lucide-react';
import type { Conversation, Message } from '../../types';

interface ReportViewProps {
  activeConversation: Conversation | null;
  activeTableNames: string[];
  messages: Message[];
  onReturnToChat: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  activeConversation,
  activeTableNames,
  messages,
  onReturnToChat,
}) => {
  const userQuestionsCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-2xs my-auto text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 text-[#C8501E] flex items-center justify-center mx-auto mb-3">
        <FileText size={22} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        Living Analysis Report
      </h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
        The deterministic report documents all questions, DuckDB SQL queries, execution durations, and schemas used during this conversation.
      </p>
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-left text-xs font-mono space-y-1 mb-4">
        <p className="font-semibold text-slate-700"># Analysis Report — {activeConversation?.title || 'Untitled'}</p>
        <p className="text-slate-500">Generated: {new Date().toLocaleString()}</p>
        <p className="text-slate-500">Tables: {activeTableNames.join(', ') || 'none'}</p>
        <p className="text-slate-500">Inquiries: {userQuestionsCount} questions logged</p>
      </div>
      <button
        type="button"
        onClick={onReturnToChat}
        className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors"
      >
        Return to Chat
      </button>
    </div>
  );
};
