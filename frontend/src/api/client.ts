const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ApiErrorPayload {
  code: string;
  message: string;
  detail?: unknown;
}

export class ApiError extends Error {
  code: string;
  detail?: unknown;
  status: number;

  constructor(status: number, error: ApiErrorPayload) {
    super(error.message || 'API request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = error.code || 'UNKNOWN_ERROR';
    this.detail = error.detail;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    // If unauthorized and not on an auth endpoint, trigger login redirect
    const isAuthRoute =
      path.includes('/api/auth/login') ||
      path.includes('/api/auth/register') ||
      path.includes('/api/auth/me');

    if (!isAuthRoute && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch (_e) {
    data = null;
  }

  if (!response.ok) {
    const errorPayload: ApiErrorPayload = data?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'Request failed',
    };
    throw new ApiError(response.status, errorPayload);
  }

  return data as T;
}

