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
      <div className="p-3 border-b border-slate-200 flex items-center justify-between md:hidden bg-white shrink-0">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 px-2 py-1 border border-slate-200 rounded bg-slate-50"
        >
          <Menu size={14} />
          <span>Workspace</span>
        </button>
        <span className="text-xs font-semibold truncate max-w-[200px]">
          {activeConversation ? activeConversation.title : 'New Analysis'}
        </span>
      </div>

      {/* Top Stage Header matching docs/design.md */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Tables in this chat:</span>
          {activeTableNames.length > 0 ? (
            activeTableNames.map((tbl) => (
              <span
                key={tbl}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono font-medium bg-slate-50 text-slate-700 rounded-md border border-slate-200"
              >
                <Layers size={11} className="text-[#C8501E]" />
                <span>{tbl}</span>
              </span>
            ))
          ) : (
            <span className="text-xs font-mono text-slate-400 italic">None selected</span>
          )}

          {activeConversation?.readOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded">
              <AlertCircle size={11} />
              <span>Read-only</span>
            </span>
          )}
        </div>

        {/* [Chat] and [Report] Tabs per docs/design.md */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('report')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'report'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
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
