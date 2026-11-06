import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileText,
  Layers,
  MessageSquare,
  Sparkles,
  StopCircle,
  Table,
  Trash2,
  Upload,
  X,
  Menu,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { MessageCard } from '../components/chat/MessageCard';
import { ChartRenderer } from '../components/chat/ChartRenderer';
import {
  createConversationApi,
  deleteConversationApi,
  getConversationsApi,
  getMessagesApi,
  streamMessageApi,
} from '../api/conversations';
import { deleteDatasetApi, getDatasetsApi, uploadDatasetsApi } from '../api/datasets';
import { generateSuggestedQuestions } from '../utils/suggestedQuestions';
import type { Conversation, Dataset, Message, TablePreview, ChartSpec } from '../types';

export const AppPage: React.FC = () => {
  // Mobile responsive sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Tab switcher: 'chat' | 'report'
  const [activeTab, setActiveTab] = useState<'chat' | 'report'>('chat');

  // Datasets state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Composer & streaming state
  const [question, setQuestion] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamStep, setStreamStep] = useState<{ index: number; name: string; status: string } | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState<string>('');
  const [streamingSql, setStreamingSql] = useState<string | null>(null);
  const [streamingTable, setStreamingTable] = useState<TablePreview | null>(null);
  const [streamingChart, setStreamingChart] = useState<ChartSpec | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Suggested questions based on snapshots
  const suggestedQuestions = useMemo(() => {
    if (!activeConversation) return [];
    return generateSuggestedQuestions(activeConversation.datasetSnapshots);
  }, [activeConversation]);

  // Tables used in active conversation
  const activeTableNames = useMemo(() => {
    if (!activeConversation) return [];
    return activeConversation.datasetSnapshots.map((s) => s.tableName);
  }, [activeConversation]);

  // Load initial workspace data
  const loadData = async () => {
    try {
      setLoadingDatasets(true);
      setLoadingConversations(true);
      const [fetchedDatasets, fetchedConversations] = await Promise.all([
        getDatasetsApi(),
        getConversationsApi(),
      ]);
      setDatasets(fetchedDatasets);
      setConversations(fetchedConversations);

      // Pre-select up to 5 datasets if none selected
      if (fetchedDatasets.length > 0) {
        setSelectedDatasetIds(fetchedDatasets.slice(0, 5).map((d) => d.id));
      }

      // Auto-select latest conversation
      if (fetchedConversations.length > 0 && !activeConversationId) {
        setActiveConversationId(fetchedConversations[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial workspace data:', err);
    } finally {
      setLoadingDatasets(false);
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    const loadConversationMessages = async () => {
      try {
        setLoadingMessages(true);
        const msgs = await getMessagesApi(activeConversationId);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadConversationMessages();
  }, [activeConversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingAnswer, streamStatus]);

  // Multi-CSV upload handler
  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setUploading(true);
    setUploadMessage('Ingesting CSV files with DuckDB...');

    try {
      const results = await uploadDatasetsApi(fileArray);
      const successful = results.filter((r) => r.status === 'ok');
      const failed = results.filter((r) => r.status === 'error');

      if (failed.length > 0) {
        setUploadMessage(
          `Uploaded ${successful.length} file(s). ${failed.length} failed: ${failed.map((f) => f.filename).join(', ')}`
        );
      } else {
        setUploadMessage(null);
      }

      const updated = await getDatasetsApi();
      setDatasets(updated);

      if (successful.length > 0) {
        const newIds = successful.map((s) => s.dataset!.id);
        setSelectedDatasetIds((prev) => Array.from(new Set([...prev, ...newIds])).slice(0, 5));
      }
    } catch (err: any) {
      setUploadMessage(err?.message || 'File upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle dataset selection checkbox
  const toggleSelectDataset = (id: string) => {
    setSelectedDatasetIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((dId) => dId !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  // Delete dataset
  const handleDeleteDataset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this dataset? Conversations using it will become read-only.')) return;

    try {
      await deleteDatasetApi(id);
      setSelectedDatasetIds((prev) => prev.filter((dId) => dId !== id));
      const [updatedDatasets, updatedConversations] = await Promise.all([
        getDatasetsApi(),
        getConversationsApi(),
      ]);
      setDatasets(updatedDatasets);
      setConversations(updatedConversations);
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  // Create conversation from checked datasets
  const handleStartAnalysis = async () => {
    if (selectedDatasetIds.length === 0 || selectedDatasetIds.length > 5) return;

    try {
      const conv = await createConversationApi({
        datasetIds: selectedDatasetIds,
      });
      setConversations((prev) => [conv, ...prev]);
      setActiveConversationId(conv.id);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create analysis conversation:', err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation, messages, and run traces?')) return;

    try {
      await deleteConversationApi(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  // Send question and stream response
  const handleSendQuestion = async (queryText?: string) => {
    const textToSend = (queryText || question).trim();
    if (!textToSend || !activeConversationId || isStreaming || activeConversation?.readOnly) {
      return;
    }

    setQuestion('');
    setIsStreaming(true);
    setStreamStatus('Initializing analytical sandbox...');
    setStreamStep(null);
    setStreamingAnswer('');
    setStreamingSql(null);
    setStreamingTable(null);
    setStreamingChart(null);

    // Optimistically add user question
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversationId: activeConversationId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamMessageApi(
        activeConversationId,
        textToSend,
        {
          onStatus: (data) => {
            setStreamStatus(data.message);
          },
          onStep: (data) => {
            setStreamStep(data);
          },
          onSql: (data) => {
            setStreamingSql(data.sql);
          },
          onTable: (data) => {
            setStreamingTable(data);
          },
          onChart: (data) => {
            setStreamingChart(data);
          },
          onToken: (data) => {
            setStreamingAnswer((prev) => prev + data.text);
          },
          onDone: async () => {
            setIsStreaming(false);
            setStreamStatus(null);
            const msgs = await getMessagesApi(activeConversationId);
            setMessages(msgs);
            const updatedConvs = await getConversationsApi();
            setConversations(updatedConvs);
          },
          onError: (data) => {
            setIsStreaming(false);
            setStreamStatus(null);
            const errorMsg: Message = {
              id: `err_${Date.now()}`,
              conversationId: activeConversationId,
              role: 'assistant',
              content: data.message || 'Execution error encountered.',
              error: data.detail || data.message,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error during message stream:', err);
        setStreamStatus(null);
        setIsStreaming(false);
      }
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamStatus(null);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <Navbar />

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
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
          {/* Section 1: Datasets */}
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
                <X size={12} className="cursor-pointer text-slate-400 hover:text-slate-700" onClick={() => setUploadMessage(null)} />
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
                            setExpandedTables((prev) => ({
                              ...prev,
                              [dataset.tableName]: !prev[dataset.tableName],
                            }));
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
                onClick={() => {
                  setActiveConversationId(null);
                  setMessages([]);
                  setMobileSidebarOpen(false);
                }}
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

        {/* Main Stage (Chat / Report) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 h-full overflow-hidden">
          {/* Mobile Header */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between md:hidden bg-white">
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

          {/* Stage Body */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
              {/* Tab 2: Living Analysis Report */}
              {activeTab === 'report' ? (
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
                    <p className="text-slate-500">Inquiries: {messages.filter((m) => m.role === 'user').length} questions logged</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-md hover:bg-slate-800"
                  >
                    Return to Chat
                  </button>
                </div>
              ) : (
                /* Tab 1: Chat Feed */
                <div className="flex-1 flex flex-col justify-between">
                  {/* Empty State */}
                  {!activeConversation || (messages.length === 0 && !isStreaming) ? (
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
                                onClick={() => handleSendQuestion(qText)}
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
                  ) : (
                    /* Messages List */
                    <div className="space-y-4 pb-6">
                      {loadingMessages ? (
                        <div className="p-8 text-center text-xs font-mono text-slate-400">
                          Loading message history...
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <MessageCard key={msg.id} message={msg} tablesUsed={activeTableNames} />
                        ))
                      )}

                      {/* Live SSE Streaming Answer Sheet */}
                      {isStreaming && (
                        <div className="flex gap-3 mb-8 items-start">
                          <div className="w-8 h-8 rounded-full bg-[#C8501E] text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse shadow-2xs">
                            <Sparkles size={15} />
                          </div>

                          <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
                            {/* Live Status Bar */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-[#C8501E] animate-ping" />
                                <span className="text-xs font-medium text-slate-800">
                                  {streamStatus || 'Processing...'}
                                </span>
                                {streamStep && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                    step {streamStep.index} · {streamStep.name}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={handleStopStream}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded transition-colors"
                                title="Stop query execution"
                              >
                                <StopCircle size={13} />
                                <span>Stop</span>
                              </button>
                            </div>

                            {/* Streaming Prose */}
                            {streamingAnswer && (
                              <div className="prose prose-sm max-w-none text-slate-800 text-sm leading-relaxed mb-4">
                                <p className="whitespace-pre-wrap">{streamingAnswer}</p>
                              </div>
                            )}

                            {/* Streaming SQL */}
                            {streamingSql && (
                              <div className="mb-4 rounded-md border border-slate-800 bg-slate-900 text-slate-100 p-3 text-xs font-mono overflow-x-auto">
                                <span className="text-[10px] uppercase text-slate-400 block mb-1">Generated SQL:</span>
                                <pre className="whitespace-pre-wrap">{streamingSql}</pre>
                              </div>
                            )}

                            {/* Streaming Chart */}
                            {streamingChart && <ChartRenderer spec={streamingChart} />}

                            {/* Streaming Table */}
                            {streamingTable && streamingTable.rows.length > 0 && (
                              <div className="mb-4 border border-slate-200 rounded overflow-x-auto max-h-52">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                                    <tr>
                                      {streamingTable.columns.map((c) => (
                                        <th key={c} className="p-2 font-mono font-semibold text-slate-700">
                                          {c}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {streamingTable.rows.slice(0, 5).map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        {streamingTable!.columns.map((c) => (
                                          <td key={c} className="p-2 font-mono text-right text-slate-900">
                                            {String(row[c] ?? '')}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Composer */}
          {activeConversation && !activeConversation.readOnly && (
            <div className="bg-white border-t border-slate-200 px-6 py-4 shrink-0 shadow-xs">
              <div className="max-w-3xl w-full mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuestion();
                  }}
                  className="relative flex items-center bg-slate-50 border border-slate-300 focus-within:border-slate-800 rounded-lg transition-colors shadow-2xs"
                >
                  <textarea
                    rows={1}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendQuestion();
                      }
                    }}
                    disabled={isStreaming}
                    placeholder={`Ask a question about ${activeTableNames.join(', ')}…`}
                    className="flex-1 py-3 pl-4 pr-12 text-sm bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none resize-none"
                  />
                  <div className="absolute right-2.5 flex items-center">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={handleStopStream}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Stop execution"
                      >
                        <StopCircle size={18} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!question.trim()}
                        className="p-1.5 bg-slate-900 text-white rounded-md hover:bg-[#C8501E] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow-2xs"
                        title="Submit query"
                      >
                        <ArrowUp size={16} />
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span>Enter to send · Shift+Enter for new line</span>
                  <span>DuckDB Sandbox · Gemini Flash</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
