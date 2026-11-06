import type { User } from '../types';
import { apiFetch } from './client';

export interface AuthResponse {
  user: User;
}

export async function loginApi(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function registerApi(email: string, password: string): Promise<User> {
  const data = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logoutApi(): Promise<void> {
  await apiFetch('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getMeApi(): Promise<User> {
  const data = await apiFetch<AuthResponse>('/api/auth/me', {
    method: 'GET',
  });
  return data.user;
}
