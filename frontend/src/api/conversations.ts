import type { Conversation, Message, RunLog } from '../types';
import { apiFetch } from './client';

export interface CreateConversationParams {
  datasetIds: string[];
  title?: string;
}

export interface StreamMessageCallbacks {
  onStatus?: (data: { message: string }) => void;
  onStep?: (data: { index: number; name: string; status: string; durationMs: number }) => void;
  onSql?: (data: { sql: string }) => void;
  onTable?: (data: { columns: string[]; rows: Record<string, unknown>[]; truncated?: boolean }) => void;
  onChart?: (data: any) => void;
  onToken?: (data: { text: string }) => void;
  onDone?: (data: { messageId: string; runId: string }) => void;
  onError?: (data: { message: string; detail?: string; runId?: string }) => void;
}

export async function createConversationApi(params: CreateConversationParams): Promise<Conversation> {
  const data = await apiFetch<{ conversation: Conversation }>('/api/conversations', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data.conversation;
}

export async function getConversationsApi(): Promise<Conversation[]> {
  const data = await apiFetch<{ conversations: Conversation[] }>('/api/conversations', {
    method: 'GET',
  });
  return data.conversations;
}

export async function getConversationApi(id: string): Promise<Conversation> {
  const data = await apiFetch<{ conversation: Conversation }>(`/api/conversations/${id}`, {
    method: 'GET',
  });
  return data.conversation;
}

export async function deleteConversationApi(id: string): Promise<void> {
  await apiFetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function getMessagesApi(id: string): Promise<Message[]> {
  const data = await apiFetch<{ messages: Message[] }>(`/api/conversations/${id}/messages`, {
    method: 'GET',
  });
  return data.messages;
}

export async function getRunsApi(id: string): Promise<RunLog[]> {
  const data = await apiFetch<{ runs: RunLog[] }>(`/api/conversations/${id}/runs`, {
    method: 'GET',
  });
  return data.runs;
}

/**
 * Streams question execution SSE events from POST /api/conversations/:id/messages
 */
export async function streamMessageApi(
  conversationId: string,
  content: string,
  callbacks: StreamMessageCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
    signal,
  });

  if (!response.ok) {
    let errMessage = 'Failed to send message';
    try {
      const errJson = await response.json();
      errMessage = errJson?.error?.message || errMessage;
    } catch (_e) {
      // ignore
    }
    callbacks.onError?.({ message: errMessage });
    throw new Error(errMessage);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming not supported by browser environment.');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const lines = part.split('\n');
      let eventType = '';
      let dataText = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          dataText = line.slice(6).trim();
        }
      }

      if (eventType && dataText) {
        try {
          const parsed = JSON.parse(dataText);
          switch (eventType) {
            case 'status':
              callbacks.onStatus?.(parsed);
              break;
            case 'step':
              callbacks.onStep?.(parsed);
              break;
            case 'sql':
              callbacks.onSql?.(parsed);
              break;
            case 'table':
              callbacks.onTable?.(parsed);
              break;
            case 'chart':
              callbacks.onChart?.(parsed);
              break;
            case 'token':
              callbacks.onToken?.(parsed);
              break;
            case 'done':
              callbacks.onDone?.(parsed);
              break;
            case 'error':
              callbacks.onError?.(parsed);
              break;
          }
        } catch (_parseErr) {
          // Ignore malformed SSE chunk
        }
      }
    }
  }
}

