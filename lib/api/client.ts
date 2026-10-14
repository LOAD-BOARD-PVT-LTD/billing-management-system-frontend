import { apiRequest } from '@/lib/api/request';

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => apiRequest<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => apiRequest<T>(path, {
    ...init,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => apiRequest<T>(path, {
    ...init,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  delete: <T>(path: string, init?: RequestInit) => apiRequest<T>(path, {
    ...init,
    method: 'DELETE',
  }),
};
