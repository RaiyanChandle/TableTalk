import React, { useRef } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  MessageSquare,
  Table,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Conversation, Dataset } from '../../types';

interface SidebarProps {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  datasets: Dataset[];
  selectedDatasetIds: string[];
  loadingDatasets: boolean;
  uploading: boolean;
  uploadMessage: string | null;
  setUploadMessage: (msg: string | null) => void;
  expandedTables: Record<string, boolean>;
  toggleSelectDataset: (id: string) => void;
  toggleTableExpanded: (tableName: string) => void;
  handleDeleteDataset: (id: string, e: React.MouseEvent) => void;
  handleFilesChosen: (files: FileList | null) => void;
  handleStartAnalysis: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  loadingConversations: boolean;
  setActiveConversationId: (id: string | null) => void;
  handleDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onNewAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  datasets,
  selectedDatasetIds,
  loadingDatasets,
  uploading,
  uploadMessage,
  setUploadMessage,
  expandedTables,
  toggleSelectDataset,
  toggleTableExpanded,
  handleDeleteDataset,
  handleFilesChosen,
  handleStartAnalysis,
  conversations,
  activeConversationId,
  loadingConversations,
  setActiveConversationId,
  handleDeleteConversation,
  onNewAnalysis,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (w-80) matching docs/design.md */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-[#DDD8CB] flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Section 1: Datasets Header */}
        <div className="p-4 border-b border-[#DDD8CB] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-[#1F1E1B] uppercase tracking-wider">
              <Table size={14} className="text-[#C8501E]" />
              <span>Datasets</span>
              <span className="text-[11px] font-mono text-[#6E6A60] font-normal">
                ({selectedDatasetIds.length}/{datasets.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-[#1F1E1B] bg-[#FAF9F6] hover:bg-[#EFECE4] border border-[#DDD8CB] rounded transition-colors"
              title="Upload up to 10 CSVs"
            >
              <Upload size={12} className="text-[#C8501E]" />
              <span>{uploading ? 'Uploading...' : '+ Upload CSVs'}</span>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFilesChosen(e.target.files)}
          />

          {uploadMessage && (
            <div className="p-2 bg-[#FAF9F6] border border-[#DDD8CB] rounded text-xs text-[#1F1E1B] flex items-center justify-between">
              <span className="truncate">{uploadMessage}</span>
              <X
                size={12}
                className="cursor-pointer text-[#6E6A60] hover:text-[#1F1E1B] shrink-0 ml-1"
                onClick={() => setUploadMessage(null)}
              />
            </div>
          )}
        </div>

        {/* Datasets Checklist (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingDatasets ? (
            <div className="p-4 text-xs font-mono text-[#6E6A60] italic text-center">Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <div className="p-6 border border-dashed border-[#DDD8CB] rounded text-center bg-[#FAF9F6]">
              <p className="text-xs text-[#1F1E1B] font-medium mb-1">No tables uploaded</p>
              <p className="text-[11px] text-[#6E6A60] mb-3">Upload CSV files to begin analytical queries.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#C8501E] text-white text-xs font-medium rounded hover:bg-[#b04518] transition-colors"
              >
                Choose CSVs
              </button>
            </div>
          ) : (
            datasets.map((dataset) => {
              const isChecked = selectedDatasetIds.includes(dataset.id);
              const isExpanded = !!expandedTables[dataset.tableName];

              return (
                <div
                  key={dataset.id}
                  className={`rounded border transition-all p-2.5 text-xs ${
                    isChecked
                      ? 'border-[#1F1E1B] bg-[#FAF9F6]'
                      : 'border-[#DDD8CB] hover:border-[#6E6A60] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => toggleSelectDataset(dataset.id)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-1"
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#C8501E] border-[#C8501E] text-white'
                            : 'bg-white border-[#DDD8CB] hover:border-[#6E6A60]'
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span
                        className={`font-mono truncate ${
                          isChecked ? 'text-[#1F1E1B] font-semibold' : 'text-[#6E6A60]'
                        }`}
                      >
                        {dataset.tableName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTableExpanded(dataset.tableName);
                        }}
                        className="p-1 text-[#6E6A60] hover:text-[#1F1E1B]"
                        title="Toggle schema columns"
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDataset(dataset.id, e)}
                        className="p-1 text-[#6E6A60] hover:text-[#C8501E]"
                        title="Delete dataset"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 pl-6.5 flex items-center gap-2 text-[11px] font-mono text-[#6E6A60]">
                    <span>{dataset.rowCount.toLocaleString()} rows</span>
                    <span>·</span>
                    <span>{dataset.columns.length} cols</span>
                  </div>

                  {/* Expandable Schema Columns */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-[#DDD8CB] space-y-1 pl-6.5">
                      {dataset.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between text-[11px] font-mono text-[#6E6A60]"
                        >
                          <span className="truncate mr-2">{col.name}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 bg-[#EFECE4] rounded text-[#1F1E1B] border border-[#DDD8CB]">
                            {col.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Start Analysis CTA Button */}
        <div className="p-3 border-t border-[#DDD8CB] bg-white">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={selectedDatasetIds.length === 0 || selectedDatasetIds.length > 5}
            className={`w-full py-2.5 px-3 text-xs font-mono font-medium rounded flex items-center justify-center gap-2 transition-colors ${
              selectedDatasetIds.length > 0 && selectedDatasetIds.length <= 5
                ? 'bg-[#1F1E1B] text-white hover:bg-[#C8501E]'
                : 'bg-[#EFECE4] text-[#6E6A60] cursor-not-allowed'
            }`}
          >
            <Database size={13} />
            <span>
              Start Analysis ({selectedDatasetIds.length} {selectedDatasetIds.length === 1 ? 'table' : 'tables'})
            </span>
          </button>
        </div>

        {/* Section 2: Saved Conversations */}
        <div className="border-t border-[#DDD8CB] bg-[#FAF9F6] p-3 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#6E6A60] font-semibold">
              Conversations ({conversations.length})
            </span>
            <button
              type="button"
              onClick={onNewAnalysis}
              className="text-[11px] font-mono text-[#C8501E] hover:underline"
            >
              + New
            </button>
          </div>

          {loadingConversations ? (
            <div className="text-xs font-mono text-[#6E6A60] italic">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-[11px] text-[#6E6A60] italic">No saved conversations yet.</div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`group flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-white text-[#1F1E1B] font-medium border border-[#DDD8CB]'
                        : 'text-[#6E6A60] hover:bg-[#EFECE4] hover:text-[#1F1E1B]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-1">
                      <MessageSquare size={13} className={isActive ? 'text-[#C8501E]' : 'text-[#6E6A60]'} />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#6E6A60] hover:text-[#C8501E] transition-opacity"
                      title="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
