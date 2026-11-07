import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/sidebar/Sidebar';
import { ChatHeader } from '../components/chat/ChatHeader';
import { EmptyState } from '../components/chat/EmptyState';
import { MessageCard } from '../components/chat/MessageCard';
import { StreamingMessage } from '../components/chat/StreamingMessage';
import { MessageComposer } from '../components/chat/MessageComposer';
import { ReportView } from '../components/report/ReportView';
import {
  createConversationApi,
  deleteConversationApi,
  getConversationsApi,
  getMessagesApi,
  streamMessageApi,
  updateConversationApi,
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
  const [streamingCharts, setStreamingCharts] = useState<ChartSpec[]>([]);

  // Refs
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

  const toggleTableExpanded = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
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

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await updateConversationApi(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error('Failed to rename conversation:', err);
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
    setStreamingCharts([]);

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
            setStreamingCharts((prev) => [...prev, data]);
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

  const handleNewAnalysis = () => {
    setActiveConversationId(null);
    setMessages([]);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      <Navbar />

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Modular Left Sidebar */}
        <Sidebar
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          datasets={datasets}
          selectedDatasetIds={selectedDatasetIds}
          loadingDatasets={loadingDatasets}
          uploading={uploading}
          uploadMessage={uploadMessage}
          setUploadMessage={setUploadMessage}
          expandedTables={expandedTables}
          toggleSelectDataset={toggleSelectDataset}
          toggleTableExpanded={toggleTableExpanded}
          handleDeleteDataset={handleDeleteDataset}
          handleFilesChosen={handleFilesChosen}
          handleStartAnalysis={handleStartAnalysis}
          conversations={conversations}
          activeConversationId={activeConversationId}
          loadingConversations={loadingConversations}
          setActiveConversationId={setActiveConversationId}
          handleDeleteConversation={handleDeleteConversation}
          handleRenameConversation={handleRenameConversation}
          onNewAnalysis={handleNewAnalysis}
        />

        {/* Main Stage (Chat / Report) */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F6F4EF] h-full overflow-hidden">
          {/* Modular Chat Header & Tabs */}
          <ChatHeader
            activeConversation={activeConversation}
            activeTableNames={activeTableNames}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setMobileSidebarOpen={setMobileSidebarOpen}
            onRenameConversation={handleRenameConversation}
          />

          {/* Stage Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 flex flex-col min-w-0">
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col min-w-0">
              {/* Tab 2: Living Analysis Report */}
              {activeTab === 'report' ? (
                <ReportView
                  activeConversation={activeConversation}
                  activeTableNames={activeTableNames}
                  messages={messages}
                  onReturnToChat={() => setActiveTab('chat')}
                />
              ) : (
                /* Tab 1: Chat Feed */
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* Empty State */}
                  {!activeConversation || (messages.length === 0 && !isStreaming) ? (
                    <EmptyState
                      activeConversation={activeConversation}
                      suggestedQuestions={suggestedQuestions}
                      onSelectQuestion={handleSendQuestion}
                    />
                  ) : (
                    /* Messages List */
                    <div className="space-y-4 pb-6 min-w-0 w-full">
                      {loadingMessages ? (
                        <div className="p-8 text-center text-xs font-mono text-[#6E6A60]">
                          Loading message history...
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <MessageCard key={msg.id} message={msg} tablesUsed={activeTableNames} />
                        ))
                      )}

                      {/* Live SSE Streaming Answer Sheet */}
                      {isStreaming && (
                        <StreamingMessage
                          streamStatus={streamStatus}
                          streamStep={streamStep}
                          streamingAnswer={streamingAnswer}
                          streamingSql={streamingSql}
                          streamingTable={streamingTable}
                          streamingChart={streamingChart}
                          streamingCharts={streamingCharts}
                          onStopStream={handleStopStream}
                        />
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
            <MessageComposer
              question={question}
              setQuestion={setQuestion}
              isStreaming={isStreaming}
              activeTableNames={activeTableNames}
              onSubmit={handleSendQuestion}
              onStop={handleStopStream}
            />
          )}
        </main>
      </div>
    </div>
  );
};
