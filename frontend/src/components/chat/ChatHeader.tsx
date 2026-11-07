import React from 'react';
import { AlertCircle, FileText, Layers, Menu, MessageSquare } from 'lucide-react';
import type { Conversation } from '../../types';

interface ChatHeaderProps {
  activeConversation: Conversation | null;
  activeTableNames: string[];
  activeTab: 'chat' | 'report';
  setActiveTab: (tab: 'chat' | 'report') => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeConversation,
  activeTableNames,
  activeTab,
  setActiveTab,
  setMobileSidebarOpen,
}) => {
  return (
    <>
      {/* Mobile Top Header */}
      <div className="p-3 border-b border-[#DDD8CB] flex items-center justify-between md:hidden bg-white shrink-0">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F1E1B] px-2.5 py-1 border border-[#DDD8CB] rounded bg-[#FAF9F6]"
        >
          <Menu size={14} />
          <span>Workspace</span>
        </button>
        <span className="text-xs font-serif font-semibold truncate max-w-[200px]">
          {activeConversation ? activeConversation.title : 'New Analysis'}
        </span>
      </div>

      {/* Top Stage Header matching docs/design.md */}
      <div className="bg-white border-b border-[#DDD8CB] px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-[#6E6A60]">Tables in this chat:</span>
          {activeTableNames.length > 0 ? (
            activeTableNames.map((tbl) => (
              <span
                key={tbl}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium bg-[#FAF9F6] text-[#1F1E1B] rounded border border-[#DDD8CB]"
              >
                <Layers size={11} className="text-[#C8501E]" />
                <span>{tbl}</span>
              </span>
            ))
          ) : (
            <span className="text-xs font-mono text-[#6E6A60] italic">None selected</span>
          )}

          {activeConversation?.readOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200 rounded">
              <AlertCircle size={11} />
              <span>Read-only</span>
            </span>
          )}
        </div>

        {/* [Chat] and [Report] Tabs per docs/design.md */}
        <div className="flex items-center bg-[#FAF9F6] p-0.5 rounded border border-[#DDD8CB]">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono transition-colors ${
              activeTab === 'chat'
                ? 'bg-white text-[#1F1E1B] font-semibold border border-[#DDD8CB] rounded-sm'
                : 'text-[#6E6A60] hover:text-[#1F1E1B]'
            }`}
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono transition-colors ${
              activeTab === 'report'
                ? 'bg-white text-[#1F1E1B] font-semibold border border-[#DDD8CB] rounded-sm'
                : 'text-[#6E6A60] hover:text-[#1F1E1B]'
            }`}
          >
            <FileText size={13} />
            <span>Report</span>
          </button>
        </div>
      </div>
    </>
  );
};
