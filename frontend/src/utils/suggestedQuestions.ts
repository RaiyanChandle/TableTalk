import type { DatasetSnapshot } from '../types';

/**
 * Generates context-aware, analytical questions based on selected table schemas.
 */
export function generateSuggestedQuestions(snapshots: DatasetSnapshot[]): string[] {
  if (!snapshots || snapshots.length === 0) {
    return [
      'Show the first 10 rows and summary statistics.',
      'What are the most common values across key columns?',
      'Count total rows and summarize key metrics.',
    ];
  }

  const suggestions: string[] = [];

  // Helper to find numeric and categorical columns
  const numericRegex = /int|float|double|decimal|numeric|real|money/i;
  const dateRegex = /date|time|timestamp/i;

  const tables = snapshots.map((s) => {
    const numCols = s.columns.filter((c) => numericRegex.test(c.type)).map((c) => c.name);
    const dateCols = s.columns.filter((c) => dateRegex.test(c.type)).map((c) => c.name);
    const catCols = s.columns
      .filter((c) => !numericRegex.test(c.type) && !dateRegex.test(c.type))
      .map((c) => c.name);
    return {
      name: s.tableName,
      displayName: s.name,
      columns: s.columns.map((c) => c.name),
      numCols,
      dateCols,
      catCols,
    };
  });

  // Cross-table suggestions if multiple tables exist
  if (tables.length > 1) {
    const t1 = tables[0];
    const t2 = tables[1];

    // Check for common join key candidates like customer_id, user_id, order_id, product_id, id
    const sharedKeys = t1.columns.filter(
      (c1) =>
        t2.columns.some((c2) => c2.toLowerCase() === c1.toLowerCase()) ||
        (c1.toLowerCase() === 'id' && t2.columns.some((c2) => c2.toLowerCase().includes(t1.name.toLowerCase()))) ||
        (t2.columns.some((c2) => c2.toLowerCase() === 'id') && t1.columns.some((c1) => c1.toLowerCase().includes(t2.name.toLowerCase())))
    );

    if (sharedKeys.length > 0 && t1.numCols.length > 0 && t2.catCols.length > 0) {
      suggestions.push(`Join ${t1.name} and ${t2.name} on ${sharedKeys[0]} to show total ${t1.numCols[0]} broken down by ${t2.catCols[0]}.`);
    } else if (t1.numCols.length > 0 && t2.catCols.length > 0) {
      suggestions.push(`Join ${t1.name} and ${t2.name} to show total ${t1.numCols[0]} broken down by ${t2.catCols[0]}.`);
    } else {
      suggestions.push(`Join ${t1.name} and ${t2.name} to find matching records and overall counts.`);
    }
  }

  // Single table analytical suggestions
  for (const t of tables) {
    if (t.numCols.length > 0 && t.catCols.length > 0) {
      suggestions.push(`What is the top 5 breakdown of total ${t.numCols[0]} by ${t.catCols[0]} in ${t.name}?`);
    }
    if (t.dateCols.length > 0 && t.numCols.length > 0) {
      suggestions.push(`Analyze monthly trend of ${t.numCols[0]} over ${t.dateCols[0]} in ${t.name}.`);
    }
    if (t.catCols.length > 0) {
      suggestions.push(`What is the distribution of ${t.catCols[0]} in ${t.name}?`);
    }
    if (suggestions.length >= 4) break;
  }

  // Fallbacks
  if (suggestions.length === 0) {
    suggestions.push(`Summarize key metrics and distributions in ${tables[0].name}.`);
    suggestions.push(`Show top 10 records by primary value in ${tables[0].name}.`);
  }

  return suggestions.slice(0, 4);
}
