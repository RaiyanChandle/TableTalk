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
    <div className="bg-white border border-[#DDD8CB] p-8 my-auto text-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-sm bg-[#FAF9F6] border border-[#DDD8CB] text-[#C8501E] flex items-center justify-center mx-auto mb-3">
        <FileText size={22} />
      </div>
      <h3 className="text-xl font-serif text-[#1F1E1B] mb-1 font-normal">
        Living Analysis Report
      </h3>
      <p className="text-xs text-[#6E6A60] max-w-md mx-auto mb-6 leading-relaxed font-sans">
        The deterministic report documents all questions, DuckDB SQL queries, execution durations, and schemas used during this conversation.
      </p>
      <div className="p-4 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-left text-xs font-mono space-y-1 mb-6">
        <p className="font-semibold text-[#1F1E1B]"># Analysis Report — {activeConversation?.title || 'Untitled'}</p>
        <p className="text-[#6E6A60]">Generated: {new Date().toLocaleString()}</p>
        <p className="text-[#6E6A60]">Tables: {activeTableNames.join(', ') || 'none'}</p>
        <p className="text-[#6E6A60]">Inquiries: {userQuestionsCount} questions logged</p>
      </div>
      <button
        type="button"
        onClick={onReturnToChat}
        className="px-4 py-2 bg-[#1F1E1B] text-white text-xs font-mono font-medium rounded hover:bg-[#C8501E] transition-colors"
      >
        Return to Chat
      </button>
    </div>
  );
};
