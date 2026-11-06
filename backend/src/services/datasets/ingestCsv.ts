import { DuckDBInstance } from '@duckdb/node-api';
import { IDatasetColumn } from '../../models/Dataset.js';

export interface IngestCsvResult {
  rowCount: number;
  columns: IDatasetColumn[];
  previewRows: Record<string, unknown>[];
}

export async function ingestCsv(filePath: string): Promise<IngestCsvResult> {
  const instance = await DuckDBInstance.create();
  const conn = await instance.connect();

  try {
    // Normalize path for DuckDB SQL (especially on Windows)
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Create temporary table from CSV
    await conn.run(
      `CREATE TABLE temp_ingest AS SELECT * FROM read_csv_auto('${normalizedPath}', sample_size=-1);`
    );

    // Get row count
    const countResult = await conn.run(`SELECT COUNT(*)::BIGINT as cnt FROM temp_ingest;`);
    const countRows = await countResult.getRows();
    countResult.closeSync();
    const rowCount = Number(countRows[0]?.[0] ?? 0);

    // Get column names and types via DESCRIBE
    const descResult = await conn.run(`DESCRIBE temp_ingest;`);
    const descRows = await descResult.getRowObjectsJson();
    descResult.closeSync();

    const columns: IDatasetColumn[] = (descRows as Record<string, any>[]).map((row) => ({
      name: String(row.column_name ?? row.Field ?? ''),
      type: String(row.column_type ?? row.Type ?? 'VARCHAR'),
    }));

    // Get preview rows (first 20)
    const previewResult = await conn.run(`SELECT * FROM temp_ingest LIMIT 20;`);
    const previewRows = (await previewResult.getRowObjectsJson()) as Record<string, unknown>[];
    previewResult.closeSync();

    return {
      rowCount,
      columns,
      previewRows,
    };
  } finally {
    try {
      conn.closeSync();
    } catch (_e) {
      // ignore
    }
  }
}

