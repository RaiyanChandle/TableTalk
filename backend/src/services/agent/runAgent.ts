import crypto from 'node:crypto';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { IRunLog, RunLog } from '../../models/RunLog.js';
import { SandboxSession } from '../sandbox/createSandbox.js';
import { getModel } from './model.js';
import { getSystemPrompt, PROMPT_VERSION } from './prompt.js';
import { AgentCallbacks, AgentExecutionState, createAgentTools, DatasetToolContext } from './tools.js';
import { TraceCollector, TraceCollectorOptions } from './traceCollector.js';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

export interface RunAgentParams {
  question: string;
  datasets: DatasetToolContext[];
  sandbox: SandboxSession;
  history?: ChatHistoryItem[];
  userId: string;
  conversationId: string;
  messageId?: string;
  collectorOptions?: TraceCollectorOptions;
  callbacks?: AgentCallbacks;
}

export interface RunAgentResult {
  runId: string;
  answer: string;
  sql?: string;
  table?: {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount?: number;
    truncated?: boolean;
  };
  chart?: {
    type: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'scatter';
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
    data: Record<string, unknown>[];
  };
  charts?: Array<{
    type: 'bar' | 'bar-horizontal' | 'line' | 'area' | 'pie' | 'scatter';
    xKey: string;
    yKeys: string[];
    title: string;
    xLabel?: string;
    yLabel?: string;
    data: Record<string, unknown>[];
  }>;
  status: 'success' | 'failed' | 'aborted';
  runLog: IRunLog;
}

/**
 * Runs the Gemini agent with LangGraph React loop, exact 3 tools, and full tracing into MongoDB.
 */
export async function runAgent(params: RunAgentParams): Promise<RunAgentResult> {
  const { question, datasets, sandbox, history = [], userId, conversationId, messageId, collectorOptions } = params;

  const runId = `run_${crypto.randomUUID()}`;
  const startTime = Date.now();

  const state: AgentExecutionState = {
    sqlAttempts: [],
    joinsUsed: [],
    callbacks: params.callbacks,
  };

  const tools = createAgentTools(sandbox, datasets, state, { userId, conversationId });
  const model = getModel();
  const systemPrompt = getSystemPrompt();

  const collector = new TraceCollector(collectorOptions);

  // Convert history items to LangChain messages (max AGENT_HISTORY_MESSAGES)
  const historyLimit = env.AGENT_HISTORY_MESSAGES || 6;
  const recentHistory = history.slice(-historyLimit);

  const messages: BaseMessage[] = [];
  for (const item of recentHistory) {
    if (item.role === 'user') {
      messages.push(new HumanMessage(item.content));
    } else {
      let assistantText = item.content;
      if (item.sql) {
        assistantText += `\n\n(Executed SQL: ${item.sql})`;
      }
      messages.push(new AIMessage(assistantText));
    }
  }

  // Add current user question
  messages.push(new HumanMessage(question));

  const agent = createReactAgent({
    llm: model,
    tools,
    messageModifier: new SystemMessage(systemPrompt),
  });

  let finalAnswer = '';
  let runStatus: 'success' | 'failed' | 'aborted' = 'success';

  // Helper to identify rate limit, quota exhaustion, or service unavailability
  const isRateLimitOrTransient = (err: any): boolean => {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode || err?.code;
    return (
      status === 429 ||
      status === 503 ||
      msg.includes('429') ||
      msg.includes('resource_exhausted') ||
      msg.includes('quota') ||
      msg.includes('rate limit') ||
      msg.includes('overloaded') ||
      msg.includes('service unavailable')
    );
  };

  // Invoke agent with exponential backoff for transient rate limits
  const maxRateLimitRetries = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRateLimitRetries; attempt++) {
    try {
      const result = await agent.invoke(
        { messages },
        {
          callbacks: [collector],
          recursionLimit: env.AGENT_MAX_STEPS || 12,
        }
      );

      const outMessages = result.messages;
      const lastMsg = outMessages[outMessages.length - 1];

      if (typeof lastMsg.content === 'string') {
        finalAnswer = lastMsg.content;
      } else if (Array.isArray(lastMsg.content)) {
        finalAnswer = lastMsg.content
          .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
          .join('');
      }

      if (!finalAnswer) {
        finalAnswer = 'Unable to generate an answer for this question with the available datasets.';
      }

      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRateLimitRetries && isRateLimitOrTransient(err)) {
        const backoffDelay = 1500 * Math.pow(2, attempt);
        console.warn(`[Agent] Gemini rate-limit encountered. Backing off for ${backoffDelay}ms before retry ${attempt + 1}/${maxRateLimitRetries}...`);
        await new Promise((res) => setTimeout(res, backoffDelay));
        continue;
      }
      break;
    }
  }

  if (lastError) {
    runStatus = 'failed';
    if (isRateLimitOrTransient(lastError)) {
      finalAnswer = 'The AI analytics service is currently experiencing high demand or rate limits. Please try again in a few moments.';
    } else {
      finalAnswer = `Analysis stopped: ${lastError?.message || 'An error occurred during agent execution.'}`;
    }
  }

  const totalDurationMs = Date.now() - startTime;

  // Build table preview (first 20 rows per design.md rules)
  const tablePreview = state.lastSqlResult
    ? {
        columns: state.lastSqlResult.columns,
        rows: state.lastSqlResult.rows.slice(0, 20),
        rowCount: state.lastSqlResult.rowCount,
        truncated: state.lastSqlResult.truncated,
      }
    : undefined;

  // Build and save the RunLog document in MongoDB
  const runLogDoc = new RunLog({
    runId,
    userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : new mongoose.Types.ObjectId(),
    conversationId: mongoose.Types.ObjectId.isValid(conversationId) ? new mongoose.Types.ObjectId(conversationId) : new mongoose.Types.ObjectId(),
    messageId: messageId && mongoose.Types.ObjectId.isValid(messageId) ? new mongoose.Types.ObjectId(messageId) : undefined,
    question,
    datasets: datasets.map((d) => ({
      datasetId: mongoose.Types.ObjectId.isValid(d.datasetId) ? new mongoose.Types.ObjectId(d.datasetId) : new mongoose.Types.ObjectId(),
      filename: d.filename,
      tableName: d.tableName,
      rowCount: d.rowCount,
      columns: d.columns,
    })),
    model: {
      provider: 'google-genai',
      name: env.GEMINI_MODEL,
      temperature: env.GEMINI_TEMPERATURE,
      maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
    },
    promptVersion: PROMPT_VERSION,
    limits: {
      maxSteps: env.AGENT_MAX_STEPS,
      maxSqlAttempts: env.AGENT_MAX_SQL_ATTEMPTS,
      sqlTimeoutMs: env.SQL_TIMEOUT_MS,
      rowsToLlm: env.SQL_ROWS_TO_LLM,
    },
    steps: collector.steps,
    sqlAttempts: state.sqlAttempts,
    joinsUsed: state.joinsUsed,
    chart: state.createdChart
      ? {
          type: state.createdChart.type,
          xKey: state.createdChart.xKey,
          yKeys: state.createdChart.yKeys,
          title: state.createdChart.title,
          xLabel: state.createdChart.xLabel,
          yLabel: state.createdChart.yLabel,
        }
      : undefined,
    charts: state.charts?.map((c) => ({
      type: c.type,
      xKey: c.xKey,
      yKeys: c.yKeys,
      title: c.title,
      xLabel: c.xLabel,
      yLabel: c.yLabel,
    })),
    resultPreview: tablePreview
      ? {
          columns: tablePreview.columns,
          rows: tablePreview.rows,
        }
      : undefined,
    answer: finalAnswer,
    status: runStatus,
    tokens: collector.tokens,
    totalDurationMs,
    createdAt: new Date(),
  });

  // Attempt to save RunLog to DB; if MongoDB is unavailable in unit testing, ignore
  try {
    await runLogDoc.save();
  } catch (_e) {
    // Non-fatal if DB is disconnected in mock/test runs
  }

  return {
    runId,
    answer: finalAnswer,
    sql: state.lastSql,
    table: tablePreview,
    chart: state.createdChart,
    charts: state.charts && state.charts.length > 0 ? state.charts : (state.createdChart ? [state.createdChart] : []),
    status: runStatus,
    runLog: runLogDoc,
  };
}
