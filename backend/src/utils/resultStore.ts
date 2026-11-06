import crypto from 'node:crypto';
import { QueryResult } from '../services/sandbox/runQuery.js';

interface StoredResult {
  result: QueryResult;
  createdAt: number;
}

class ResultStore {
  private store = new Map<string, StoredResult>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

  constructor() {
    // Periodic cleanup of expired results
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  set(result: QueryResult): string {
    const resultId = `res_${crypto.randomUUID()}`;
    this.store.set(resultId, {
      result,
      createdAt: Date.now(),
    });
    return resultId;
  }

  get(resultId: string): QueryResult | undefined {
    const entry = this.store.get(resultId);
    if (!entry) return undefined;

    if (Date.now() - entry.createdAt > this.TTL_MS) {
      this.store.delete(resultId);
      return undefined;
    }

    return entry.result;
  }

  delete(resultId: string): void {
    this.store.delete(resultId);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now - value.createdAt > this.TTL_MS) {
        this.store.delete(key);
      }
    }
  }
}

export const resultStore = new ResultStore();
