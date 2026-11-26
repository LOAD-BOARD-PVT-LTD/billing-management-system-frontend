import { apiClient } from '@/lib/api/client';

export type ApiClientOverrides = Partial<Pick<typeof apiClient, 'get' | 'post' | 'put' | 'delete'>>;

export function mockApiClient(overrides: ApiClientOverrides): { restore: () => void } {
  const original = {
    get: apiClient.get,
    post: apiClient.post,
    put: apiClient.put,
    delete: apiClient.delete,
  };

  if (overrides.get) apiClient.get = overrides.get;
  if (overrides.post) apiClient.post = overrides.post;
  if (overrides.put) apiClient.put = overrides.put;
  if (overrides.delete) apiClient.delete = overrides.delete;

  return {
    restore: () => {
      apiClient.get = original.get;
      apiClient.post = original.post;
      apiClient.put = original.put;
      apiClient.delete = original.delete;
    },
  };
}

export function mockGlobalFetch(impl: typeof globalThis.fetch): { restore: () => void } {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = impl;

  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}
