import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { chartTypeSchema } from '../../schemas/index.js';
import { resultStore } from '../../utils/resultStore.js';
import { CandidateJoin, findCandidateJoins } from '../sandbox/candidateJoins.js';
import { SandboxSession } from '../sandbox/createSandbox.js';
import { QueryResult } from '../sandbox/runQuery.js';

export interface DatasetToolContext {
  datasetId: string;
  filename: string;
  tableName: string;
  rowCount: number;
  columns: { name: string; type: string }[];
}

export interface AgentCallbacks {
  onSql?: (data: { sql: string }) => void;
  onTable?: (data: { columns: string[]; rows: Record<string, unknown>[]; truncated?: boolean; rowCount?: number }) => void;
  onChart?: (data: any) => void;
}

export interface AgentExecutionState {
  sqlAttempts: {
    sql: string;
    purpose?: string;
    status: 'ok' | 'error' | 'rejected' | 'timeout';
    error?: string;
    rowCount?: number;
    truncated?: boolean;
    durationMs: number;
  }[];
  lastSqlResult?: QueryResult;
  lastSql?: string;
  createdChart?: {
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
  joinsUsed: string[];
  callbacks?: AgentCallbacks;
}

/**
 * Creates the exact three agent tools bound to the current question's sandbox session and datasets.
 */
export function createAgentTools(
  sandbox: SandboxSession,
  datasets: DatasetToolContext[],
  state: AgentExecutionState,
  auditContext?: { userId?: string; conversationId?: string }
) {
  // Pre-calculate candidate joins across the selected datasets
  const candidateJoins: CandidateJoin[] = findCandidateJoins(datasets);

  // 1. Tool: get_schema
  const getSchemaTool = tool(
    async (input) => {
      const filterTables = input.tables && input.tables.length > 0
        ? new Set(input.tables.map((t) => t.toLowerCase()))
        : null;

      const targetDatasets = filterTables
        ? datasets.filter((d) => filterTables.has(d.tableName.toLowerCase()))
        : datasets;

      const tablesWithSamples = [];

      for (const d of targetDatasets) {
        let sampleRows: Record<string, unknown>[] = [];
        try {
          const sampleResult = await sandbox.execute(`SELECT * FROM "${d.tableName}" LIMIT 5;`);
          sampleRows = sampleResult.rows;
        } catch (_e) {
          // If sample fetch fails, continue with empty samples
        }

        tablesWithSamples.push({
          name: d.tableName,
          filename: d.filename,
          rowCount: d.rowCount,
          columns: d.columns,
          sampleRows,
        });
      }

      return JSON.stringify({
        tables: tablesWithSamples,
        candidateJoins,
      });
    },
    {
      name: 'get_schema',
      description:
        'Inspect table names, column names, DuckDB types, sample rows (5 per table), and suggested candidate joins across the loaded CSV tables.',
      schema: z.object({
        tables: z
          .array(z.string())
          .optional()
          .describe('Optional list of table names to filter. Leave empty to inspect all available tables.'),
      }),
    }
  );

  // 2. Tool: run_sql
  const runSqlTool = tool(
    async (input) => {
      const attemptIndex = state.sqlAttempts.length + 1;
      const maxAttempts = env.AGENT_MAX_SQL_ATTEMPTS || 3;

      if (attemptIndex > maxAttempts) {
        const errorMsg = `Maximum SQL attempts (${maxAttempts}) reached for this question. Do not attempt further SQL queries.`;
        state.sqlAttempts.push({
          sql: input.sql,
          purpose: input.purpose,
          status: 'rejected',
          error: errorMsg,
          durationMs: 0,
        });
        return JSON.stringify({ error: errorMsg });
      }

      const startTime = Date.now();
      try {
        const result = await sandbox.execute(input.sql);
        const durationMs = Date.now() - startTime;

        const resultId = resultStore.set(result);
        state.lastSqlResult = result;
        state.lastSql = input.sql;

        // Detect joins used in the SQL
        const joinMatches = input.sql.match(/\bJOIN\s+["`]?(\w+)["`]?\s+(?:AS\s+\w+\s+)?ON\s+([^;\n]+)/gi);
        if (joinMatches) {
          for (const match of joinMatches) {
            if (!state.joinsUsed.includes(match.trim())) {
              state.joinsUsed.push(match.trim());
            }
          }
        }

        state.sqlAttempts.push({
          sql: input.sql,
          purpose: input.purpose,
          status: 'ok',
          rowCount: result.rowCount,
          truncated: result.truncated,
          durationMs,
        });

        // Structured SQL audit logging (Rule 5.7: userId, conversationId, duration, rowCount; NO raw data)
        console.log(
          `[SQL Audit] userId=${auditContext?.userId || 'anonymous'} conversationId=${auditContext?.conversationId || 'none'} status=ok durationMs=${durationMs} rowCount=${result.rowCount} truncated=${result.truncated} sql="${input.sql.replace(/\s+/g, ' ').trim()}"`
        );

        // Limit preview rows shown to LLM to prevent context overflow (default 50)
        const rowsToLlm = env.SQL_ROWS_TO_LLM || 50;
        const previewRows = result.rows.slice(0, rowsToLlm);

        // Notify callbacks if listening
        state.callbacks?.onSql?.({ sql: input.sql });
        state.callbacks?.onTable?.({
          columns: result.columns,
          rows: previewRows,
          truncated: result.truncated,
          rowCount: result.rowCount,
        });

        return JSON.stringify({
          resultId,
          columns: result.columns,
          rows: previewRows,
          rowCount: result.rowCount,
          truncated: result.truncated,
        });
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const errorMessage = err?.message || 'SQL query failed.';

        const isTimeout = errorMessage.toLowerCase().includes('time');
        const isRejected = errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('only select');

        state.sqlAttempts.push({
          sql: input.sql,
          purpose: input.purpose,
          status: isTimeout ? 'timeout' : isRejected ? 'rejected' : 'error',
          error: errorMessage,
          durationMs,
        });

        // Structured SQL audit logging for failed queries
        console.log(
          `[SQL Audit] userId=${auditContext?.userId || 'anonymous'} conversationId=${auditContext?.conversationId || 'none'} status=${isTimeout ? 'timeout' : isRejected ? 'rejected' : 'error'} durationMs=${durationMs} error="${errorMessage.replace(/\s+/g, ' ').trim()}" sql="${input.sql.replace(/\s+/g, ' ').trim()}"`
        );

        return JSON.stringify({
          error: `${errorMessage} (Attempt ${attemptIndex} of ${maxAttempts})`,
        });
      }
    },
    {
      name: 'run_sql',
      description:
        'Execute a single read-only DuckDB SQL query (SELECT or WITH ... SELECT). Returns up to 50 rows, total rowCount, column names, and a resultId. If it returns an error, inspect the error and refine your query (max 3 attempts).',
      schema: z.object({
        sql: z.string().describe('The single SELECT or WITH ... SELECT DuckDB query to execute.'),
        purpose: z.string().describe('Brief explanation of what this SQL query computes.'),
      }),
    }
  );

  // 3. Tool: create_chart
  const createChartTool = tool(
    async (input) => {
      const stored = resultStore.get(input.resultId);
      if (!stored) {
        return JSON.stringify({
          error: `Result with ID "${input.resultId}" not found or expired. Call run_sql first.`,
        });
      }

      // Verify that xKey and yKeys exist in stored columns
      const availableCols = new Set(stored.columns);

      if (!availableCols.has(input.xKey)) {
        return JSON.stringify({
          error: `Column "${input.xKey}" specified for xKey does not exist in result columns: [${stored.columns.join(', ')}]`,
        });
      }

      for (const yKey of input.yKeys) {
        if (!availableCols.has(yKey)) {
          return JSON.stringify({
            error: `Column "${yKey}" specified in yKeys does not exist in result columns: [${stored.columns.join(', ')}]`,
          });
        }
      }

      // Attach data server-side (max 500 rows)
      const chartObj = {
        type: input.type,
        xKey: input.xKey,
        yKeys: input.yKeys,
        title: input.title,
        xLabel: input.xLabel,
        yLabel: input.yLabel,
        data: stored.rows.slice(0, 500),
      };

      state.createdChart = chartObj;
      if (!state.charts) {
        state.charts = [];
      }
      state.charts.push(chartObj);

      state.callbacks?.onChart?.(chartObj);

      return JSON.stringify({
        ok: true,
        message: `Chart "${input.title}" (${input.type}) created successfully.`,
      });
    },
    {
      name: 'create_chart',
      description:
        'Specify a chart to visualize the query results referenced by resultId. Verifies that xKey and yKeys exist in the result. The server automatically attaches the chart data.',
      schema: z.object({
        resultId: z.string().describe('The resultId returned by run_sql.'),
        type: chartTypeSchema.describe('Chart type: bar, line, area, pie, or scatter.'),
        xKey: z.string().describe('Column name for the X-axis (dimension or category).'),
        yKeys: z.array(z.string()).min(1).max(4).describe('Array of 1 to 4 numeric column names for the Y-axis.'),
        title: z.string().describe('A concise, finding-oriented title for the chart.'),
        xLabel: z.string().optional().describe('Optional label for the X-axis.'),
        yLabel: z.string().optional().describe('Optional label for the Y-axis.'),
      }),
    }
  );

  return [getSchemaTool, runSqlTool, createChartTool] as [
    typeof getSchemaTool,
    typeof runSqlTool,
    typeof createChartTool,
  ];
}
