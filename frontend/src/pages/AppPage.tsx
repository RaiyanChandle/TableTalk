import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Database,
  Layers,
  MessageSquare,
  Plus,
  Square,
  StopCircle,
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
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // Query composer state
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

  // Load initial datasets and conversations
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

      // Auto-select latest conversation if available
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

  // Handle CSV file upload
  const handleFilesChosen = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    setUploading(true);
    setUploadMessage('Ingesting and parsing CSV files with DuckDB...');

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

      // Automatically select newly uploaded datasets
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
        return prev; // capped at 5 datasets
      }
      return [...prev, id];
    });
  };

  // Delete a dataset
  const handleDeleteDataset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this dataset? Referenced conversations will become read-only.')) {
      return;
    }
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

  // Create a new conversation from checked datasets
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

  // Send question and start SSE stream
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

    // Optimistically add user message
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
            // Refresh messages list from DB for complete consistency
            const msgs = await getMessagesApi(activeConversationId);
            setMessages(msgs);
            // Refresh conversation title in sidebar if updated
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

  // Abort running stream
  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      setStreamStatus(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col font-sans text-[#22201D] selection:bg-[#EFECE4]">
      <Navbar />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Left Rail (280px) */}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#EFECE4] border-r border-[#DDD8CB] flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Rail Header */}
          <div className="p-3 border-b border-[#DDD8CB] flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#6B665D]">
              Workspace
            </span>
            <button
              onClick={() => {
                setActiveConversationId(null);
                setMessages([]);
                setMobileSidebarOpen(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-sans bg-white hover:bg-[#F6F4EF] text-[#22201D] border border-[#DDD8CB] transition-colors"
              title="Start a new analytical thread"
            >
              <Plus size={13} className="text-[#C8501E]" />
              <span>New Analysis</span>
            </button>
          </div>

          {/* Section 1: Saved Conversations */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665D] block mb-2">
                Analyses ({conversations.length})
              </span>

              {loadingConversations ? (
                <div className="p-3 text-xs text-[#6B665D] italic">Loading threads...</div>
              ) : conversations.length === 0 ? (
                <div className="p-3 text-xs text-[#6B665D] border border-dashed border-[#DDD8CB] bg-[#F6F4EF]">
                  No active analyses. Select tables below to begin.
                </div>
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
                        className={`group flex items-center justify-between p-2 text-xs cursor-pointer border transition-colors ${
                          isActive
                            ? 'bg-white border-[#22201D] text-[#22201D] font-medium'
                            : 'bg-transparent border-transparent hover:bg-white/60 text-[#6B665D] hover:text-[#22201D]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate mr-1">
                          <MessageSquare size={13} className={isActive ? 'text-[#C8501E]' : 'text-[#6B665D]'} />
                          <span className="truncate">{conv.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#6B665D] hover:text-[#C8501E] transition-opacity"
                          title="Delete analysis"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Data Sources */}
            <div className="p-3 border-t border-[#DDD8CB]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665D]">
                  Data Sources ({datasets.length})
                </span>
                <span className="text-[10px] font-mono text-[#6B665D]">
                  {selectedDatasetIds.length}/5 selected
                </span>
              </div>

              {/* Multi-file Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mb-3 p-3 border border-dashed border-[#DDD8CB] hover:border-[#22201D] bg-[#F6F4EF] hover:bg-white cursor-pointer text-center transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => handleFilesChosen(e.target.files)}
                />
                <Upload size={14} className="mx-auto mb-1 text-[#C8501E]" />
                <p className="text-xs font-sans text-[#22201D]">Drop CSVs or click to upload</p>
                <p className="text-[10px] font-mono text-[#6B665D]">Up to 10 files · 25MB each</p>
              </div>

              {uploading && (
                <div className="p-2 mb-3 bg-[#EFECE4] border border-[#DDD8CB] text-xs font-mono text-[#C8501E] animate-pulse">
                  {uploadMessage || 'Uploading...'}
                </div>
              )}

              {uploadMessage && !uploading && (
                <div className="p-2 mb-3 bg-white border border-[#DDD8CB] text-xs font-sans text-[#6B665D] flex items-center justify-between">
                  <span className="truncate">{uploadMessage}</span>
                  <X size={12} className="cursor-pointer" onClick={() => setUploadMessage(null)} />
                </div>
              )}

              {/* Datasets List */}
              {loadingDatasets ? (
                <div className="p-3 text-xs text-[#6B665D] italic">Loading datasets...</div>
              ) : datasets.length === 0 ? (
                <div className="p-3 text-xs text-[#6B665D] italic">No datasets uploaded yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {datasets.map((dataset) => {
                    const isSelected = selectedDatasetIds.includes(dataset.id);
                    const isExpanded = !!expandedTables[dataset.tableName];

                    return (
                      <div key={dataset.id} className="bg-white border border-[#DDD8CB] p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div
                            onClick={() => toggleSelectDataset(dataset.id)}
                            className="flex items-center gap-2 cursor-pointer truncate mr-1"
                          >
                            {isSelected ? (
                              <CheckSquare size={14} className="text-[#C8501E]" />
                            ) : (
                              <Square size={14} className="text-[#6B665D]" />
                            )}
                            <span className="font-mono text-[#22201D] font-medium truncate">
                              {dataset.tableName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                setExpandedTables((prev) => ({
                                  ...prev,
                                  [dataset.tableName]: !prev[dataset.tableName],
                                }))
                              }
                              className="p-1 text-[#6B665D] hover:text-[#22201D]"
                              title="Toggle schema tree"
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                            <button
                              onClick={(e) => handleDeleteDataset(dataset.id, e)}
                              className="p-1 text-[#6B665D] hover:text-[#C8501E]"
                              title="Delete dataset"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[#6B665D]">
                          <span>{dataset.rowCount.toLocaleString()} rows</span>
                          <span>·</span>
                          <span>{dataset.columns.length} cols</span>
                        </div>

                        {/* Schema Column Tree */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-[#DDD8CB] space-y-1 pl-1">
                            {dataset.columns.map((col) => (
                              <div
                                key={col.name}
                                className="flex items-center justify-between text-[11px] font-mono text-[#6B665D]"
                              >
                                <span className="truncate">{col.name}</span>
                                <span className="text-[9px] uppercase px-1 bg-[#F6F4EF] border border-[#DDD8CB]">
                                  {col.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action: Start Analysis */}
          <div className="p-3 border-t border-[#DDD8CB] bg-[#F6F4EF]">
            <button
              onClick={handleStartAnalysis}
              disabled={selectedDatasetIds.length === 0 || selectedDatasetIds.length > 5}
              className={`w-full py-2 px-3 text-xs font-sans font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                selectedDatasetIds.length > 0 && selectedDatasetIds.length <= 5
                  ? 'bg-[#22201D] text-white border-[#22201D] hover:bg-[#C8501E] hover:border-[#C8501E]'
                  : 'bg-[#DDD8CB] text-[#6B665D] border-[#DDD8CB] cursor-not-allowed'
              }`}
            >
              <Database size={13} />
              <span>
                Start Analysis ({selectedDatasetIds.length} {selectedDatasetIds.length === 1 ? 'table' : 'tables'})
              </span>
            </button>
          </div>
        </aside>

        {/* Main Analytical Stage (760px Centered Column) */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F6F4EF] overflow-y-auto">
          {/* Mobile Top Navbar Bar */}
          <div className="p-3 border-b border-[#DDD8CB] flex items-center justify-between md:hidden bg-[#EFECE4]">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-mono text-[#22201D] p-1 border border-[#DDD8CB] bg-white"
            >
              <Menu size={14} />
              <span>Workspace</span>
            </button>
            <span className="text-xs font-serif truncate max-w-[200px]">
              {activeConversation ? activeConversation.title : 'New Analysis'}
            </span>
          </div>

          {/* Stage Container */}
          <div className="flex-1 max-w-[800px] w-full mx-auto px-4 py-8">
            {/* If no conversation is active: Welcome & Setup */}
            {!activeConversation ? (
              <div className="my-12 text-center">
                <div className="inline-flex p-3 bg-white border border-[#DDD8CB] mb-4">
                  <Database size={28} className="text-[#C8501E]" />
                </div>
                <h1 className="text-3xl font-serif text-[#22201D] mb-2">AI Data Analyst Workbench</h1>
                <p className="text-sm font-sans text-[#6B665D] max-w-md mx-auto mb-6">
                  Select 1 to 5 tables from your data sources on the left and click{' '}
                  <strong className="text-[#22201D]">Start Analysis</strong> to initiate an in-memory DuckDB sandbox session.
                </p>

                {datasets.length === 0 ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#22201D] hover:bg-[#C8501E] text-white text-xs font-sans transition-colors"
                  >
                    <Upload size={14} />
                    <span>Upload your first CSV</span>
                  </button>
                ) : (
                  <div className="p-4 bg-white border border-[#DDD8CB] max-w-md mx-auto text-left">
                    <span className="text-[11px] font-mono text-[#6B665D] uppercase tracking-wider block mb-2">
                      Available tables for analysis
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {datasets.map((d) => (
                        <span
                          key={d.id}
                          onClick={() => toggleSelectDataset(d.id)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono cursor-pointer border transition-colors ${
                            selectedDatasetIds.includes(d.id)
                              ? 'bg-[#22201D] text-white border-[#22201D]'
                              : 'bg-[#F6F4EF] text-[#22201D] border-[#DDD8CB] hover:bg-[#EFECE4]'
                          }`}
                        >
                          <Layers size={11} />
                          <span>{d.tableName}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={handleStartAnalysis}
                      disabled={selectedDatasetIds.length === 0}
                      className="w-full py-2 bg-[#22201D] hover:bg-[#C8501E] text-white text-xs font-sans font-medium transition-colors disabled:bg-[#DDD8CB] disabled:cursor-not-allowed"
                    >
                      Analyze Selected ({selectedDatasetIds.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Conversation Header Sheet */}
                <div className="mb-8 pb-4 border-b border-[#DDD8CB]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-serif text-[#22201D] leading-tight">
                      {activeConversation.title}
                    </h1>

                    {activeConversation.readOnly && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-mono bg-[#FBF0EE] text-[#8C2314] border border-[#F3C3BC]">
                        <AlertCircle size={12} />
                        <span>Read-Only (Dataset Deleted)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#6B665D]">
                    <span>Tables in this chat:</span>
                    {activeTableNames.map((tbl) => (
                      <span
                        key={tbl}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#DDD8CB] text-[#22201D]"
                      >
                        <Layers size={11} className="text-[#C8501E]" />
                        <span>{tbl}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Empty State with Suggested Questions */}
                {messages.length === 0 && !isStreaming && (
                  <div className="my-8 p-6 bg-white border border-[#DDD8CB]">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B665D] block mb-2">
                      Schema Ready for Inquiry
                    </span>
                    <h3 className="text-lg font-serif text-[#22201D] mb-2">
                      What would you like to uncover across these tables?
                    </h3>
                    <p className="text-xs font-sans text-[#6B665D] mb-4">
                      The analytical agent will inspect column relations, write single-statement DuckDB SQL queries, execute them safely in your sandbox, and graph the results.
                    </p>

                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B665D] block">
                        Suggested Starting Points:
                      </span>
                      {suggestedQuestions.map((qText, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendQuestion(qText)}
                          className="w-full text-left p-2.5 text-xs font-sans bg-[#F6F4EF] hover:bg-[#EFECE4] border border-[#DDD8CB] text-[#22201D] transition-colors flex items-center justify-between group"
                        >
                          <span>{qText}</span>
                          <ChevronRight size={13} className="text-[#6B665D] group-hover:text-[#22201D]" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message History Feed */}
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs font-mono text-[#6B665D]">
                    Loading message history...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <MessageCard key={msg.id} message={msg} tablesUsed={activeTableNames} />
                    ))}
                  </div>
                )}

                {/* Live SSE Streaming Answer Sheet */}
                {isStreaming && (
                  <div className="mb-12 bg-white border border-[#DDD8CB] p-6">
                    {/* Live Progress Bar */}
                    <div className="flex items-center justify-between border-b border-[#DDD8CB] pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#C8501E] animate-ping" />
                        <span className="text-xs font-mono text-[#22201D] font-medium">
                          {streamStatus || 'Processing...'}
                        </span>
                        {streamStep && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#EFECE4] border border-[#DDD8CB] text-[#6B665D]">
                            step {streamStep.index} · {streamStep.name}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={handleStopStream}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-[#8C2314] hover:bg-[#FBF0EE] border border-[#F3C3BC] transition-colors"
                        title="Halt query execution"
                      >
                        <StopCircle size={13} />
                        <span>Stop</span>
                      </button>
                    </div>

                    {/* Live streaming token text */}
                    {streamingAnswer && (
                      <div className="prose prose-sm max-w-none text-[#22201D] font-sans text-sm leading-relaxed mb-4">
                        <p className="whitespace-pre-wrap">{streamingAnswer}</p>
                      </div>
                    )}

                    {/* Live SQL preview if arrived */}
                    {streamingSql && (
                      <div className="mb-4 p-3 bg-[#22201D] text-[#EFECE4] text-xs font-mono overflow-x-auto">
                        <span className="text-[10px] uppercase text-[#DDD8CB] block mb-1">Generated SQL:</span>
                        <pre className="whitespace-pre-wrap">{streamingSql}</pre>
                      </div>
                    )}

                    {/* Live Chart preview if arrived */}
                    {streamingChart && <ChartRenderer spec={streamingChart} />}

                    {/* Live Table if arrived */}
                    {streamingTable && streamingTable.rows.length > 0 && (
                      <div className="mb-4 border border-[#DDD8CB] overflow-x-auto max-h-52">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-[#EFECE4] sticky top-0 border-b border-[#DDD8CB]">
                            <tr>
                              {streamingTable.columns.map((c) => (
                                <th key={c} className="p-2 font-mono font-medium">
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {streamingTable.rows.slice(0, 5).map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-[#DDD8CB]">
                                {streamingTable!.columns.map((c) => (
                                  <td key={c} className="p-2 font-mono text-right text-[#22201D]">
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
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Sticky Composer (At the bottom of the analytical view) */}
          {activeConversation && !activeConversation.readOnly && (
            <div className="sticky bottom-0 bg-[#F6F4EF]/95 backdrop-blur-sm border-t border-[#DDD8CB] p-4">
              <div className="max-w-[800px] w-full mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuestion();
                  }}
                  className="relative flex items-center bg-white border border-[#22201D]"
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
                    placeholder={`Ask a question across ${activeTableNames.join(', ')}... (Press Enter)`}
                    className="flex-1 py-3 pl-4 pr-12 text-sm font-sans bg-transparent text-[#22201D] placeholder-[#6B665D] focus:outline-none resize-none"
                  />
                  <div className="absolute right-2 flex items-center">
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={handleStopStream}
                        className="p-1.5 text-[#8C2314] hover:bg-[#FBF0EE] transition-colors"
                        title="Stop execution"
                      >
                        <StopCircle size={18} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!question.trim()}
                        className="p-1.5 text-[#22201D] hover:text-[#C8501E] disabled:text-[#DDD8CB] disabled:cursor-not-allowed transition-colors"
                        title="Submit query"
                      >
                        <ArrowUp size={18} />
                      </button>
                    )}
                  </div>
                </form>

                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[#6B665D]">
                  <span>Press Enter to send, Shift+Enter for multiline</span>
                  <span>DuckDB In-Memory Sandbox · Gemini Flash</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
