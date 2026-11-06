// API & Domain Types (mirrored from backend schemas)

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface DatasetColumn {
  name: string;
  type: string;
}

export interface Dataset {
  id: string;
  name: string;
  originalFilename: string;
  tableName: string;
  sizeBytes: number;
  rowCount: number;
  columns: DatasetColumn[];
  createdAt: string;
}

export interface DatasetUploadResult {
  filename: string;
  status: 'ok' | 'error';
  dataset?: Dataset;
  message?: string;
}

export interface DatasetSnapshot {
  datasetId: string;
  name: string;
  tableName: string;
  rowCount: number;
  columns: DatasetColumn[];
}

export interface Conversation {
  id: string;
  title: string;
  datasetIds: string[];
  datasetSnapshots: DatasetSnapshot[];
  readOnly: boolean;
  createdAt: string;
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter';

export interface ChartSpec {
  type: ChartType;
  title: string;
  xKey: string;
  yKeys: string[];
  xLabel?: string;
  yLabel?: string;
  data: Record<string, string | number | null>[];
}

export interface TablePreview {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount?: number;
  truncated?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  tablePreview?: TablePreview;
  chartSpec?: ChartSpec;
  error?: string;
  runId?: string;
  createdAt: string;
}

export interface StepTrace {
  index: number;
  type: 'llm' | 'tool';
  name: string;
  input?: unknown;
  outputSummary?: string;
  status: 'ok' | 'error' | 'rejected' | 'timeout';
  error?: string;
  durationMs: number;
  startedAt?: string;
}

export interface SqlAttempt {
  sql: string;
  purpose?: string;
  status: 'ok' | 'error' | 'rejected' | 'timeout';
  error?: string;
  rowCount?: number;
  truncated?: boolean;
  durationMs: number;
}

export interface RunLog {
  runId: string;
  userId: string;
  conversationId: string;
  messageId: string;
  question: string;
  datasets: {
    datasetId: string;
    filename: string;
    tableName: string;
    rowCount: number;
    columns: DatasetColumn[];
  }[];
  model: {
    provider: string;
    name: string;
    temperature: number;
    maxOutputTokens: number;
  };
  promptVersion: string;
  steps: StepTrace[];
  sqlAttempts: SqlAttempt[];
  joinsUsed?: string[];
  chart?: {
    type: ChartType;
    xKey: string;
    yKeys: string[];
    title: string;
  };
  resultPreview?: TablePreview;
  answer: string;
  status: 'success' | 'failed' | 'aborted';
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  totalDurationMs: number;
  createdAt: string;
}

export interface AnalysisReport {
  conversationId: string;
  generatedAt: string;
  markdown: string;
  stats: {
    questions: number;
    sqlAttempts: number;
    sqlFailures: number;
    avgLatencyMs: number;
    tokens: {
      input: number;
      output: number;
    };
  };
}

