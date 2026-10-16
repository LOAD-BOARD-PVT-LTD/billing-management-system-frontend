import { authenticatedFetch } from '@/lib/authentication/authenticated-fetch';

export function buildApiUrl(path: string): string {
  return `/backend-api/${path.replace(/^\/+/, '')}`;
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
      const parsed = JSON.parse(body) as {
        detail?: string;
        message?: string;
        code?: string;
        error?: { message?: string };
      };
      message = parsed.error?.message ?? parsed.detail ?? parsed.message ?? body;
      if (parsed.code && message !== body) {
        message = `${message} (${parsed.code})`;
      }
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
