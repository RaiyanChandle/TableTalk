import { Dataset } from '../../models/Dataset.js';

/**
 * Sanitizes a raw filename to a valid SQL table name:
 * - strips file extension
 * - lowercase
 * - non-alphanumeric characters become '_'
 * - collapse multiple underscores
 * - trim leading/trailing underscores
 * - prefix 't_' if it starts with a digit or is empty
 * - truncate to 40 chars
 */
export function sanitizeTableName(filename: string): string {
  // Strip extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');

  let sanitized = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!sanitized || /^[0-9]/.test(sanitized)) {
    sanitized = `t_${sanitized}`;
  }

  return sanitized.slice(0, 40);
}

/**
 * Generates a unique tableName for a given user.
 * On collisions, appends _2, _3, etc.
 */
export async function generateUniqueTableName(
  userId: string,
  baseFilename: string
): Promise<string> {
  const baseName = sanitizeTableName(baseFilename);

  // Check if baseName is already taken
  const existing = await Dataset.find({
    userId,
    tableName: new RegExp(`^${baseName}(_\\d+)?$`),
  }).select('tableName');

  const takenNames = new Set(existing.map((d) => d.tableName));

  if (!takenNames.has(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (takenNames.has(`${baseName}_${counter}`)) {
    counter++;
  }

  return `${baseName}_${counter}`;
}

