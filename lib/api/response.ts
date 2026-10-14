import { ApiError } from '@/lib/api/errors';

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('Invalid JSON response', response.status, text);
  }
}

export async function assertSuccess(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await parseJsonResponse<unknown>(response).catch(() => undefined);
  const detail = typeof body === 'object' && body !== null
    ? (body as { detail?: string; message?: string; error?: { message?: string } }).error?.message
      ?? (body as { detail?: string; message?: string; error?: { message?: string } }).detail
      ?? (body as { detail?: string; message?: string; error?: { message?: string } }).message
    : undefined;

  throw new ApiError(`Request failed with status ${response.status}`, response.status, detail ?? 'Request failed');
}
