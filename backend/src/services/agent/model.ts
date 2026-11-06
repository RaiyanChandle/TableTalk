import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { env } from '../../config/env.js';

export function getModel(): ChatGoogleGenerativeAI {
  return new ChatGoogleGenerativeAI({
    model: env.GEMINI_MODEL,
    apiKey: env.GOOGLE_API_KEY,
    temperature: env.GEMINI_TEMPERATURE,
    maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
    maxRetries: env.LLM_MAX_RETRIES,
  });
}

