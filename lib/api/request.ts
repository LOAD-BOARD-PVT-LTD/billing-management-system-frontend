import { authenticatedFetch } from '@/lib/authentication/authenticated-fetch';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/u, '') ?? '';

export function buildApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/+$/u, '');

  if (!base) {
    return `/api/v1/${path}`;
  }

  return /\/api\/v1$/iu.test(base) ? `${base}/${path}` : `${base}/api/v1/${path}`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let message = body;

    try {
      const parsed = JSON.parse(body) as { detail?: string; message?: string; error?: { message?: string } };
      message = parsed.error?.message ?? parsed.detail ?? parsed.message ?? body;
    } catch {
      // Keep original text if JSON parsing fails.
    }

    throw new Error(`Request failed (${response.status})${message ? `: ${message.slice(0, 300)}` : ''}`);
  }

  const payload = await response.text();

  if (!payload) {
    return undefined as T;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return payload as T;
  }
}
