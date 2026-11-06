export interface SqlValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedSql?: string;
}

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'CREATE',
  'ATTACH',
  'DETACH',
  'COPY',
  'EXPORT',
  'IMPORT',
  'INSTALL',
  'LOAD',
  'PRAGMA',
  'SET',
  'CALL',
  'EXECUTE',
  'PREPARE',
  'DEALLOCATE',
  'VACUUM',
  'CHECKPOINT',
  'TRANSACTION',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
];

const FORBIDDEN_FUNCTIONS = [
  'read_csv',
  'read_csv_auto',
  'read_parquet',
  'read_json',
  'read_json_auto',
  'read_ndjson',
  'read_blob',
  'read_text',
  'scan_csv',
  'glob',
  'httpfs',
  'write_csv',
  'copy_to',
  'parquet_scan',
];

/**
 * Strips comments and string literals from SQL to safely inspect tokens and semicolons.
 */
function stripCommentsAndStrings(sql: string): { stripped: string; commentless: string } {
  let commentless = '';
  let stripped = ''; // strings replaced with placeholder '___STR___'
  let i = 0;
  const n = sql.length;

  while (i < n) {
    // Single-line comment -- ...
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n' && sql[i] !== '\r') {
        i++;
      }
      commentless += ' ';
      stripped += ' ';
      continue;
    }

    // Multi-line comment /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) {
        i++;
      }
      i += 2;
      commentless += ' ';
      stripped += ' ';
      continue;
    }

    // Single-quoted string literal
    if (sql[i] === "'") {
      let strVal = "'";
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          strVal += "''";
          i += 2;
        } else if (sql[i] === "'") {
          strVal += "'";
          i++;
          break;
        } else {
          strVal += sql[i];
          i++;
        }
      }
      commentless += strVal;
      stripped += ' ___STR___ ';
      continue;
    }

    // Double-quoted identifier
    if (sql[i] === '"') {
      let identVal = '"';
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          identVal += '""';
          i += 2;
        } else if (sql[i] === '"') {
          identVal += '"';
          i++;
          break;
        } else {
          identVal += sql[i];
          i++;
        }
      }
      commentless += identVal;
      stripped += ' ___IDENT___ ';
      continue;
    }

    commentless += sql[i];
    stripped += sql[i];
    i++;
  }

  return { stripped, commentless };
}

/**
 * Validates that an SQL query complies with sandbox safety constraints:
 * 1. Must not exceed 4,000 characters
 * 2. Exactly one statement (no multiple queries chained with semicolons)
 * 3. Must begin with SELECT or WITH
 * 4. Cannot contain forbidden DDL/DML/administrative keywords
 * 5. Cannot call external access or file reading functions
 */
export function validateSql(rawSql: string): SqlValidationResult {
  if (!rawSql || typeof rawSql !== 'string') {
    return { isValid: false, error: 'SQL query must be a non-empty string.' };
  }

  const trimmed = rawSql.trim();

  // Max query length check
  if (trimmed.length > 4000) {
    return {
      isValid: false,
      error: `SQL query exceeds maximum allowed length of 4,000 characters (received ${trimmed.length}).`,
    };
  }

  const { stripped, commentless } = stripCommentsAndStrings(trimmed);
  const cleanStripped = stripped.trim();

  if (!cleanStripped) {
    return { isValid: false, error: 'SQL query contains no executable statements.' };
  }

  // Check for forbidden keywords (word boundary matching)
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(stripped)) {
      return {
        isValid: false,
        error: `Forbidden SQL keyword detected: "${keyword}". Sandbox permits only read-only queries.`,
      };
    }
  }

  // Check for forbidden functions
  for (const func of FORBIDDEN_FUNCTIONS) {
    const regex = new RegExp(`\\b${func}\\s*\\(`, 'i');
    if (regex.test(stripped)) {
      return {
        isValid: false,
        error: `Forbidden SQL function detected: "${func}()". File and external access functions are disabled.`,
      };
    }
  }

  // Check for multiple statements (semicolons outside quotes/comments)
  // Allow a single trailing semicolon at the end
  const statements = stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    return {
      isValid: false,
      error: 'Multiple SQL statements are not allowed. Please submit a single query.',
    };
  }

  // Check for statement starting with SELECT or WITH
  const startsWithAllowed = /^(SELECT|WITH)\b/i.test(cleanStripped);
  if (!startsWithAllowed) {
    return {
      isValid: false,
      error: 'Only SELECT or WITH ... SELECT queries are permitted in the sandbox.',
    };
  }

  return {
    isValid: true,
    sanitizedSql: commentless.trim().replace(/;$/, ''),
  };
}
