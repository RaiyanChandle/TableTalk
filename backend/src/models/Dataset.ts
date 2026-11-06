import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDatasetColumn {
  name: string;
  type: string;
}

export interface IDataset extends Document {
  userId: Types.ObjectId;
  name: string;
  originalFilename: string;
  tableName: string;
  filePath: string;
  sizeBytes: number;
  rowCount: number;
  columns: IDatasetColumn[];
  createdAt: Date;
}

const datasetColumnSchema = new Schema<IDatasetColumn>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const datasetSchema = new Schema<IDataset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    tableName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    rowCount: {
      type: Number,
      required: true,
    },
    columns: {
      type: [datasetColumnSchema],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index to ensure uniqueness of tableName per user
datasetSchema.index({ userId: 1, tableName: 1 }, { unique: true });

export const Dataset = mongoose.model<IDataset>('Dataset', datasetSchema);

