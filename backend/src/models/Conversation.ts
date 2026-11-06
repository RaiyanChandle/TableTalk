import mongoose, { Schema, type Types } from 'mongoose';

export interface IDatasetSnapshot {
  datasetId: Types.ObjectId;
  name: string;
  tableName: string;
  rowCount: number;
  columns: {
    name: string;
    type: string;
  }[];
}

export interface IConversation {
  userId: Types.ObjectId;
  title: string;
  datasetIds: Types.ObjectId[];
  datasetSnapshots: IDatasetSnapshot[];
  readOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DatasetSnapshotSchema = new Schema<IDatasetSnapshot>(
  {
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
    name: { type: String, required: true },
    tableName: { type: String, required: true },
    rowCount: { type: Number, required: true },
    columns: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'Untitled Analysis' },
    datasetIds: [{ type: Schema.Types.ObjectId, ref: 'Dataset', required: true }],
    datasetSnapshots: { type: [DatasetSnapshotSchema], required: true },
    readOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
