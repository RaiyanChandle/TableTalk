export interface TableColumnInfo {
  name: string;
  type: string;
}

export interface TableInfo {
  tableName: string;
  columns: TableColumnInfo[];
}

export interface CandidateJoin {
  left: string;
  right: string;
  reason: string;
}

function normalizeType(type: string): string {
  const upper = type.toUpperCase();
  if (
    upper.includes('INT') ||
    upper === 'BIGINT' ||
    upper === 'SMALLINT' ||
    upper === 'TINYINT' ||
    upper === 'HUGEINT'
  ) {
    return 'integer';
  }
  if (
    upper.includes('FLOAT') ||
    upper.includes('DOUBLE') ||
    upper.includes('DECIMAL') ||
    upper.includes('NUMERIC') ||
    upper.includes('REAL')
  ) {
    return 'numeric';
  }
  if (upper.includes('CHAR') || upper.includes('TEXT') || upper.includes('STRING')) {
    return 'string';
  }
  if (upper.includes('DATE') || upper.includes('TIME')) {
    return 'datetime';
  }
  if (upper.includes('BOOL')) {
    return 'boolean';
  }
  return upper;
}

function cleanName(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, '');
}

/**
 * Checks if two column names are likely join keys between two tables:
 * e.g. orders.customer_id <-> customers.id
 * or line_items.order_id <-> orders.id
 * or orders.cust_id <-> customers.cust_id
 */
function isKeyMatch(
  tableA: string,
  colA: string,
  tableB: string,
  colB: string
): { isMatch: boolean; reason?: string } {
  const cleanColA = cleanName(colA);
  const cleanColB = cleanName(colB);
  const cleanTableA = cleanName(tableA);
  const cleanTableB = cleanName(tableB);

  // Exact match (e.g. both have user_id or department_code)
  if (cleanColA === cleanColB) {
    const isIdOrCode =
      cleanColA.endsWith('id') ||
      cleanColA.endsWith('key') ||
      cleanColA.endsWith('code') ||
      cleanColA.endsWith('num');
    return {
      isMatch: true,
      reason: isIdOrCode
        ? `Identical key column names ("${colA}")`
        : `Identical column names ("${colA}")`,
    };
  }

  // Singular table name check: tableA="customers", colA="id", colB="customer_id" or "customerId"
  const singularA = cleanTableA.endsWith('s') ? cleanTableA.slice(0, -1) : cleanTableA;
  const singularB = cleanTableB.endsWith('s') ? cleanTableB.slice(0, -1) : cleanTableB;

  if (
    (cleanColA === 'id' && (cleanColB === `${singularA}id` || cleanColB === `${cleanTableA}id`)) ||
    (cleanColB === 'id' && (cleanColA === `${singularB}id` || cleanColA === `${cleanTableB}id`))
  ) {
    return {
      isMatch: true,
      reason: `Primary/foreign key relationship ("${colA}" ↔ "${colB}")`,
    };
  }

  return { isMatch: false };
}

/**
 * Inspects multiple tables and suggests likely candidate joins.
 */
export function findCandidateJoins(tables: TableInfo[]): CandidateJoin[] {
  const candidateJoins: CandidateJoin[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const tableA = tables[i];
      const tableB = tables[j];

      for (const colA of tableA.columns) {
        for (const colB of tableB.columns) {
          const typeA = normalizeType(colA.type);
          const typeB = normalizeType(colB.type);

          // Types must be compatible
          const typesCompatible =
            typeA === typeB ||
            (typeA === 'integer' && typeB === 'numeric') ||
            (typeA === 'numeric' && typeB === 'integer');

          if (!typesCompatible) {
            continue;
          }

          const match = isKeyMatch(tableA.tableName, colA.name, tableB.tableName, colB.name);

          if (match.isMatch) {
            const left = `${tableA.tableName}.${colA.name}`;
            const right = `${tableB.tableName}.${colB.name}`;
            const pairKey = [left, right].sort().join('<->');

            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              candidateJoins.push({
                left,
                right,
                reason: `${match.reason} with compatible types (${colA.type} ↔ ${colB.type})`,
              });
            }
          }
        }
      }
    }
  }

  return candidateJoins;
}

