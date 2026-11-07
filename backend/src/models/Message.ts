import mongoose, { Schema, type Types } from 'mongoose';

export interface IMessage {
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  tablePreview?: {
    columns: string[];
    rows: Record<string, unknown>[];
    truncated?: boolean;
  };
  chartSpec?: {
    type: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'scatter';
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
    data?: Record<string, unknown>[];
  };
  chartSpecs?: Array<{
    type: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'scatter';
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
    data?: Record<string, unknown>[];
  }>;
  error?: string;
  runId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sql: { type: String },
    tablePreview: {
      columns: [{ type: String }],
      rows: [{ type: Schema.Types.Mixed }],
      truncated: { type: Boolean },
    },
    chartSpec: {
      type: { type: String, enum: ['bar', 'bar-horizontal', 'line', 'area', 'pie', 'scatter'] },
      xKey: { type: String },
      yKeys: [{ type: String }],
      title: { type: String },
      xLabel: { type: String },
      yLabel: { type: String },
      data: [{ type: Schema.Types.Mixed }],
    },
    chartSpecs: [
      {
        type: { type: String, enum: ['bar', 'bar-horizontal', 'line', 'area', 'pie', 'scatter'] },
        xKey: { type: String },
        yKeys: [{ type: String }],
        title: { type: String },
        xLabel: { type: String },
        yLabel: { type: String },
        data: [{ type: Schema.Types.Mixed }],
      },
    ],
    error: { type: String },
    runId: { type: String },
  },
  { timestamps: true }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
