import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load .env
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/ai-data-analyst'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('session'),
  COOKIE_SAME_SITE: z.enum(['lax', 'none', 'strict']).default('lax'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  BCRYPT_COST: z.coerce.number().default(12),

  GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_TEMPERATURE: z.coerce.number().default(0),
  GEMINI_MAX_OUTPUT_TOKENS: z.coerce.number().default(2048),
  LLM_TIMEOUT_MS: z.coerce.number().default(60000),
  LLM_MAX_RETRIES: z.coerce.number().default(3),

  PROMPT_VERSION: z.string().default('v1'),
  AGENT_MAX_STEPS: z.coerce.number().default(12),
  AGENT_MAX_SQL_ATTEMPTS: z.coerce.number().default(3),
  AGENT_HISTORY_MESSAGES: z.coerce.number().default(6),

  STORAGE_DIR: z.string().default(path.resolve(process.cwd(), 'storage')),
  MAX_FILES_PER_UPLOAD: z.coerce.number().default(10),
  MAX_FILE_MB: z.coerce.number().default(25),
  MAX_UPLOAD_TOTAL_MB: z.coerce.number().default(100),
  MAX_TABLES_PER_CONVERSATION: z.coerce.number().default(5),

  SQL_TIMEOUT_MS: z.coerce.number().default(5000),
  SQL_MEMORY_LIMIT: z.string().default('512MB'),
  SQL_THREADS: z.coerce.number().default(2),
  SQL_MAX_RESULT_ROWS: z.coerce.number().default(1000),
  SQL_ROWS_TO_LLM: z.coerce.number().default(50),

  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_WINDOW_MIN: z.coerce.number().default(15),
  CHAT_RATE_LIMIT_PER_HOUR: z.coerce.number().default(30),
  UPLOAD_RATE_LIMIT_PER_HOUR: z.coerce.number().default(20),

  LOG_LEVEL: z.string().default('info'),
  LANGSMITH_TRACING: z.coerce.boolean().default(false),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

