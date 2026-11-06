import { DuckDBConnection } from '@duckdb/node-api';
import { env } from '../../config/env.js';
import { validateSql } from './validateSql.js';

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

export interface RunQueryOptions {
  timeoutMs?: number;
  maxRows?: number;
}

/**
 * Validates, executes with timeout & row limit, and formats query results from DuckDB.
 */
export async function runQuery(
  conn: DuckDBConnection,
  rawSql: string,
  options: RunQueryOptions = {}
): Promise<QueryResult> {
  const timeoutMs = options.timeoutMs ?? env.SQL_TIMEOUT_MS;
  const maxRows = options.maxRows ?? env.SQL_MAX_RESULT_ROWS;

  // 1. Validate SQL
  const validation = validateSql(rawSql);
  if (!validation.isValid || !validation.sanitizedSql) {
    throw new Error(validation.error || 'SQL validation failed.');
  }

  const sanitizedSql = validation.sanitizedSql;

  // 2. Wrap query to enforce row cap + detect truncation
  // Query for (maxRows + 1) rows so we know if there are more
  const cappedSql = `SELECT * FROM (${sanitizedSql}) LIMIT ${maxRows + 1};`;

  const startTime = Date.now();
  let timedOut = false;

  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    try {
      conn.interrupt();
    } catch (_e) {
      // ignore
    }
  }, timeoutMs);

  try {
    const result = await conn.run(cappedSql);
    const durationMs = Date.now() - startTime;

    const columns = result.columnNames();
    const fetchedRows = (await result.getRowObjectsJson()) as Record<string, unknown>[];
    result.closeSync();

    let truncated = false;
    let rows = fetchedRows;

    if (fetchedRows.length > maxRows) {
      truncated = true;
      rows = fetchedRows.slice(0, maxRows);
    }

    return {
      columns,
      rows,
      rowCount: rows.length,
      truncated,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;

    if (timedOut || String(err?.message || '').toLowerCase().includes('interrupt')) {
      throw new Error(
        `Query execution timed out after ${timeoutMs}ms (took ${durationMs}ms). Try narrowing filters or aggregating.`
      );
    }

    throw err;
  } finally {
    clearTimeout(timeoutTimer);
  }
}

