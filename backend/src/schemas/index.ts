import { z } from 'zod';

// ---------- Auth Schemas ----------
export const registerSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ---------- Dataset Schemas ----------
export const columnSchema = z.object({
  name: z.string(),
  type: z.string(),
});

export const renameDatasetSchema = z.object({
  name: z.string().trim().min(1).optional(),
  tableName: z.string().trim().min(1).optional(),
});

// ---------- Conversation Schemas ----------
export const createConversationSchema = z.object({
  datasetIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least 1 dataset')
    .max(5, 'Select up to 5 datasets'),
  title: z.string().trim().optional(),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'Question cannot be empty'),
});

// ---------- Chart Spec Schema ----------
export const chartTypeSchema = z.enum(['bar', 'line', 'area', 'pie', 'scatter']);

export const chartSpecSchema = z.object({
  type: chartTypeSchema,
  title: z.string(),
  xKey: z.string(),
  yKeys: z.array(z.string()).min(1).max(4),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  data: z.array(z.record(z.union([z.string(), z.number(), z.null()]))).default([]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RenameDatasetInput = z.infer<typeof renameDatasetSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ChartSpec = z.infer<typeof chartSpecSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;

