import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { env } from '../../config/env.js';
import { QueryResult, runQuery, RunQueryOptions } from './runQuery.js';

export interface SandboxDataset {
  tableName: string;
  filePath: string;
}

export interface SandboxSession {
  execute: (sql: string, options?: RunQueryOptions) => Promise<QueryResult>;
  close: () => void;
  getTableNames: () => string[];
  getConnection: () => DuckDBConnection;
}

/**
 * Creates an isolated in-memory DuckDB sandbox session:
 * 1. Loads the specified dataset CSVs as distinct tables.
 * 2. Locks memory limit and worker threads.
 * 3. Enforces enable_external_access=false and lock_configuration=true.
 */
export async function createSandbox(datasets: SandboxDataset[]): Promise<SandboxSession> {
  const instance = await DuckDBInstance.create();
  const conn = await instance.connect();

  try {
    // 1. Ingest all datasets into named tables
    for (const dataset of datasets) {
      const normalizedPath = dataset.filePath.replace(/\\/g, '/');
      await conn.run(
        `CREATE TABLE "${dataset.tableName}" AS SELECT * FROM read_csv_auto('${normalizedPath}', sample_size=-1);`
      );
    }

    // 2. Configure resource limits
    await conn.run(`SET memory_limit = '${env.SQL_MEMORY_LIMIT}';`);
    await conn.run(`SET threads = ${env.SQL_THREADS};`);

    // 3. Security lockdown: disable external access and lock configuration
    await conn.run('SET enable_external_access = false;');
    await conn.run('SET lock_configuration = true;');

    const tableNames = datasets.map((d) => d.tableName);

    return {
      execute: (sql: string, options?: RunQueryOptions) => runQuery(conn, sql, options),
      close: () => {
        try {
          conn.closeSync();
        } catch (_e) {
          // ignore
        }
      },
      getTableNames: () => [...tableNames],
      getConnection: () => conn,
    };
  } catch (err) {
    try {
      conn.closeSync();
    } catch (_e) {
      // ignore
    }
    throw err;
  }
}

