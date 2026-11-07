import React, { useState } from 'react';
import { AlertCircle, Check, FileText, Layers, Menu, MessageSquare, Pencil, X } from 'lucide-react';
import type { Conversation } from '../../types';

interface ChatHeaderProps {
  activeConversation: Conversation | null;
  activeTableNames: string[];
  activeTab: 'chat' | 'report';
  setActiveTab: (tab: 'chat' | 'report') => void;
  setMobileSidebarOpen: (open: boolean) => void;
  onRenameConversation?: (id: string, newTitle: string) => Promise<void> | void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeConversation,
  activeTableNames,
  activeTab,
  setActiveTab,
  setMobileSidebarOpen,
  onRenameConversation,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const startEditing = () => {
    if (!activeConversation) return;
    setTitleDraft(activeConversation.title);
    setIsEditingTitle(true);
  };

  const saveTitle = () => {
    if (!activeConversation) return;
    const trimmed = titleDraft.trim();
    if (trimmed && onRenameConversation && trimmed !== activeConversation.title) {
      onRenameConversation(activeConversation.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="p-3 border-b border-[#DDD8CB] flex items-center justify-between md:hidden bg-white shrink-0 min-w-0">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F1E1B] px-2.5 py-1 border border-[#DDD8CB] rounded bg-[#FAF9F6] shrink-0"
        >
          <Menu size={14} />
          <span>Workspace</span>
        </button>

        <div className="flex items-center gap-1.5 min-w-0 mx-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 min-w-0">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="px-1.5 py-0.5 text-xs font-serif bg-white border border-[#1F1E1B] rounded focus:outline-none max-w-[140px]"
              />
              <button type="button" onClick={saveTitle} className="p-1 text-emerald-700">
                <Check size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-serif font-semibold truncate max-w-[140px]">
                {activeConversation ? activeConversation.title : 'New Analysis'}
              </span>
              {activeConversation && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="p-1 text-[#6E6A60] hover:text-[#1F1E1B]"
                  title="Rename analysis"
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Stage Header matching docs/design.md */}
      <div className="bg-white border-b border-[#DDD8CB] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 min-w-0">
        <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
          {/* Active Conversation Title & Rename (Desktop) */}
          {activeConversation && (
            <div className="flex items-center gap-2 min-w-0">
              {isEditingTitle ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveTitle();
                  }}
                  className="flex items-center gap-1 min-w-0"
                >
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-xs font-serif font-semibold text-[#1F1E1B] bg-white border border-[#1F1E1B] rounded focus:outline-none max-w-[260px]"
                  />
                  <button type="submit" className="p-1 text-emerald-700 hover:text-emerald-900" title="Save title">
                    <Check size={13} strokeWidth={3} />
                  </button>
                  <button type="button" onClick={() => setIsEditingTitle(false)} className="p-1 text-[#6E6A60] hover:text-[#1F1E1B]" title="Cancel">
                    <X size={13} />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 group min-w-0">
                  <h3
                    className="font-serif font-semibold text-sm text-[#1F1E1B] truncate max-w-[240px] md:max-w-[320px] cursor-pointer"
                    onClick={startEditing}
                    title="Click to rename"
                  >
                    {activeConversation.title}
                  </h3>
                  <button
                    type="button"
                    onClick={startEditing}
                    className="p-1 text-[#6E6A60] hover:text-[#1F1E1B] opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Rename conversation"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <span className="text-[#DDD8CB] hidden sm:inline">|</span>
            </div>
          )}

          {/* Tables in this chat */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-[#6E6A60]">Tables:</span>
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
        </div>

        {/* [Chat] and [Report] Tabs per docs/design.md */}
        <div className="flex items-center bg-[#FAF9F6] p-0.5 rounded border border-[#DDD8CB] shrink-0">
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
