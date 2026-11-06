/**
 * Exports tabular data as a downloadable CSV file
 */
export function exportTableAsCsv(
  filename: string,
  columns: string[],
  rows: Record<string, unknown>[]
): void {
  if (!columns || columns.length === 0 || !rows || rows.length === 0) {
    return;
  }

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map(escapeCell).join(',');
  const rowLines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col])).join(',')
  );

  const csvContent = [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

