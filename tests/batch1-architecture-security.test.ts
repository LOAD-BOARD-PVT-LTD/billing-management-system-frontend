import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedFetch } from '@/lib/authentication/authenticated-fetch';
import { getAccessToken, setAccessToken, removeAccessToken } from '@/features/auth/api/token-storage';

describe('Batch 1: Architecture & Security Improvements', () => {
  describe('Task 1.2: 401 Unauthorized Interception & Session Invalidation', () => {
    it('attaches Bearer token to request headers when present', async () => {
      let interceptedHeaders: Headers | undefined;
      const originalFetch = globalThis.fetch;
      const originalLocalStorage = globalThis.localStorage;
      const originalWindow = globalThis.window;

      const storage = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => { storage.set(k, v); },
        removeItem: (k: string) => { storage.delete(k); },
        clear: () => storage.clear(),
        key: () => null,
        length: storage.size,
      };
      // @ts-expect-error Mocking window for Node environment
      globalThis.window = {
        dispatchEvent: () => true,
      };

      setAccessToken('test-access-token-xyz');

      globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        interceptedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      };

      try {
        const response = await authenticatedFetch('/backend-api/resources/test');
        assert.equal(response.status, 200);
        assert.equal((interceptedHeaders as Headers | undefined)?.get('Authorization'), 'Bearer test-access-token-xyz');
      } finally {
        removeAccessToken();
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalLocalStorage;
        globalThis.window = originalWindow;
      }
    });

    it('intercepts 401, removes token and dispatches auth:unauthorized event', async () => {
      const originalFetch = globalThis.fetch;
      const originalLocalStorage = globalThis.localStorage;

      const storage = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => { storage.set(k, v); },
        removeItem: (k: string) => { storage.delete(k); },
        clear: () => storage.clear(),
        key: () => null,
        length: storage.size,
      };

      const eventTarget = new EventTarget();
      let unauthorizedEventDispatched = false;
      const mockWindow = {
        dispatchEvent: (event: Event) => {
          if (event.type === 'auth:unauthorized') {
            unauthorizedEventDispatched = true;
          }
          return eventTarget.dispatchEvent(event);
        },
        addEventListener: eventTarget.addEventListener.bind(eventTarget),
        removeEventListener: eventTarget.removeEventListener.bind(eventTarget),
      };

      const originalWindow = globalThis.window;
      // @ts-expect-error Mocking window for Node environment
      globalThis.window = mockWindow;

      setAccessToken('expired-access-token');

      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { message: 'Token expired' } }), { status: 401 });
      };

      try {
        const response = await authenticatedFetch('/backend-api/resources/test');
        assert.equal(response.status, 401);
        assert.equal(unauthorizedEventDispatched, true, 'auth:unauthorized event should have been dispatched');
        assert.equal(getAccessToken(), null, 'Token should have been removed from storage');
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalLocalStorage;
        globalThis.window = originalWindow;
      }
    });

    it('does not dispatch auth:unauthorized on 401 when no token was present', async () => {
      const originalFetch = globalThis.fetch;
      const originalLocalStorage = globalThis.localStorage;

      const storage = new Map<string, string>();
      globalThis.localStorage = {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: (k: string, v: string) => { storage.set(k, v); },
        removeItem: (k: string) => { storage.delete(k); },
        clear: () => storage.clear(),
        key: () => null,
        length: storage.size,
      };

      let unauthorizedEventDispatched = false;
      const originalWindow = globalThis.window;
      // @ts-expect-error Mocking window for Node environment
      globalThis.window = {
        dispatchEvent: (event: Event) => {
          if (event.type === 'auth:unauthorized') unauthorizedEventDispatched = true;
          return true;
        },
      };

      removeAccessToken();

      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: { message: 'Invalid credentials' } }), { status: 401 });
      };

      try {
        const response = await authenticatedFetch('/backend-api/auth/login');
        assert.equal(response.status, 401);
        assert.equal(unauthorizedEventDispatched, false, 'Should not dispatch event for unauthenticated 401');
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.localStorage = originalLocalStorage;
        globalThis.window = originalWindow;
      }
    });
  });
});
