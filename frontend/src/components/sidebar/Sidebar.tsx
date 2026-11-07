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
      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (w-80) matching docs/design.md */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Section 1: Datasets Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 uppercase tracking-wider">
              <Table size={14} className="text-[#C8501E]" />
              <span>Datasets</span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                ({selectedDatasetIds.length}/{datasets.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md shadow-2xs transition-colors"
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
            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 flex items-center justify-between">
              <span className="truncate">{uploadMessage}</span>
              <X
                size={12}
                className="cursor-pointer text-slate-400 hover:text-slate-700 shrink-0 ml-1"
                onClick={() => setUploadMessage(null)}
              />
            </div>
          )}
        </div>

        {/* Datasets Checklist (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingDatasets ? (
            <div className="p-4 text-xs text-slate-400 italic text-center">Loading datasets...</div>
          ) : datasets.length === 0 ? (
            <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50">
              <p className="text-xs text-slate-600 font-medium mb-1">No tables loaded</p>
              <p className="text-[11px] text-slate-400 mb-3">Upload CSV files to begin ad-hoc analysis.</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#C8501E] text-white text-xs font-medium rounded shadow-2xs hover:bg-[#b04518]"
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
                  className={`rounded-lg border transition-all p-2.5 text-xs bg-white ${
                    isChecked
                      ? 'border-slate-800 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div
                      onClick={() => toggleSelectDataset(dataset.id)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 mr-1"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#C8501E] border-[#C8501E] text-white'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span
                        className={`font-mono truncate ${
                          isChecked ? 'text-slate-900 font-semibold' : 'text-slate-600'
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
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Toggle schema tree"
                      >
                        {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDataset(dataset.id, e)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Delete dataset"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 pl-6.5 flex items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>{dataset.rowCount.toLocaleString()} rows</span>
                    <span>·</span>
                    <span>{dataset.columns.length} cols</span>
                  </div>

                  {/* Expandable Schema Columns */}
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 pl-6.5">
                      {dataset.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between text-[11px] font-mono text-slate-500"
                        >
                          <span className="truncate mr-2">{col.name}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-100 rounded text-slate-600">
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
        <div className="p-3 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={selectedDatasetIds.length === 0 || selectedDatasetIds.length > 5}
            className={`w-full py-2.5 px-3 text-xs font-medium rounded-md flex items-center justify-center gap-2 transition-colors shadow-xs ${
              selectedDatasetIds.length > 0 && selectedDatasetIds.length <= 5
                ? 'bg-slate-900 text-white hover:bg-[#C8501E]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Database size={13} />
            <span>
              Start Analysis ({selectedDatasetIds.length} {selectedDatasetIds.length === 1 ? 'table' : 'tables'})
            </span>
          </button>
        </div>

        {/* Section 2: Saved Conversations */}
        <div className="border-t border-slate-200 bg-slate-50/60 p-3 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Conversations ({conversations.length})
            </span>
            <button
              type="button"
              onClick={onNewAnalysis}
              className="text-[11px] font-medium text-[#C8501E] hover:underline"
            >
              + New
            </button>
          </div>

          {loadingConversations ? (
            <div className="text-xs text-slate-400 italic">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-[11px] text-slate-400 italic">No saved conversations yet.</div>
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
                    className={`group flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-1">
                      <MessageSquare size={13} className={isActive ? 'text-[#C8501E]' : 'text-slate-400'} />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
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
