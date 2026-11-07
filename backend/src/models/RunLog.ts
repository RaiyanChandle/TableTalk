import mongoose, { Schema, Types } from 'mongoose';

export interface IRunLogStep {
  index: number;
  type: 'llm' | 'tool';
  name: string;
  input?: unknown;
  outputSummary?: string;
  status: 'ok' | 'error' | 'rejected' | 'timeout';
  error?: string;
  durationMs: number;
  startedAt?: Date;
}

export interface IRunLogSqlAttempt {
  sql: string;
  purpose?: string;
  status: 'ok' | 'error' | 'rejected' | 'timeout';
  error?: string;
  rowCount?: number;
  truncated?: boolean;
  durationMs: number;
}

export interface IRunLogDataset {
  datasetId: Types.ObjectId;
  filename: string;
  tableName: string;
  rowCount: number;
  columns: { name: string; type: string }[];
}

export interface IRunLog {
  runId: string;
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  messageId?: Types.ObjectId;
  question: string;
  datasets: IRunLogDataset[];
  model: {
    provider: string;
    name: string;
    temperature: number;
    maxOutputTokens: number;
  };
  promptVersion: string;
  limits: {
    maxSteps: number;
    maxSqlAttempts: number;
    sqlTimeoutMs: number;
    rowsToLlm: number;
  };
  steps: IRunLogStep[];
  sqlAttempts: IRunLogSqlAttempt[];
  joinsUsed?: string[];
  chart?: {
    type: string;
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
  };
  charts?: Array<{
    type: string;
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
  }>;
  resultPreview?: {
    columns: string[];
    rows: Record<string, unknown>[];
  };
  answer: string;
  status: 'success' | 'failed' | 'aborted';
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  totalDurationMs: number;
  versions: {
    node: string;
    langchain: string;
    langgraph: string;
    duckdb: string;
  };
  createdAt: Date;
}

const runLogSchema = new Schema<IRunLog>(
  {
    runId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    question: { type: String, required: true },
    datasets: [
      {
        datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
        filename: { type: String, required: true },
        tableName: { type: String, required: true },
        rowCount: { type: Number, required: true },
        columns: [
          {
            name: { type: String, required: true },
            type: { type: String, required: true },
          },
        ],
      },
    ],
    model: {
      provider: { type: String, default: 'google-genai' },
      name: { type: String, required: true },
      temperature: { type: Number, default: 0 },
      maxOutputTokens: { type: Number, default: 2048 },
    },
    promptVersion: { type: String, required: true },
    limits: {
      maxSteps: { type: Number, default: 12 },
      maxSqlAttempts: { type: Number, default: 3 },
      sqlTimeoutMs: { type: Number, default: 5000 },
      rowsToLlm: { type: Number, default: 50 },
    },
    steps: [
      {
        index: Number,
        type: { type: String, enum: ['llm', 'tool'] },
        name: String,
        input: Schema.Types.Mixed,
        outputSummary: String,
        status: { type: String, enum: ['ok', 'error', 'rejected', 'timeout'] },
        error: String,
        durationMs: Number,
        startedAt: Date,
      },
    ],
    sqlAttempts: [
      {
        sql: String,
        purpose: String,
        status: { type: String, enum: ['ok', 'error', 'rejected', 'timeout'] },
        error: String,
        rowCount: Number,
        truncated: Boolean,
        durationMs: Number,
      },
    ],
    joinsUsed: [String],
    chart: {
      type: { type: String },
      xKey: String,
      yKeys: [String],
      title: String,
      xLabel: String,
      yLabel: String,
    },
    charts: [
      {
        type: { type: String },
        xKey: String,
        yKeys: [String],
        title: String,
        xLabel: String,
        yLabel: String,
      },
    ],
    resultPreview: {
      columns: [String],
      rows: [Schema.Types.Mixed],
    },
    answer: { type: String, default: '' },
    status: { type: String, enum: ['success', 'failed', 'aborted'], required: true },
    tokens: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    totalDurationMs: { type: Number, default: 0 },
    versions: {
      node: { type: String, default: process.version },
      langchain: { type: String, default: '0.3.15' },
      langgraph: { type: String, default: '0.2.45' },
      duckdb: { type: String, default: '2.0.0-r.1' },
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

export const RunLog = mongoose.model<IRunLog>('RunLog', runLogSchema);
