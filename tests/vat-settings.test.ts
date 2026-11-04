import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_VAT_SETTINGS,
  fetchVatSettings,
  saveVatSettings,
} from '@/features/settings/api/vat-settings.api';
import { apiClient } from '@/lib/api/client';

const originalGet = apiClient.get;
const originalPost = apiClient.post;
const originalPut = apiClient.put;

afterEach(() => {
  apiClient.get = originalGet;
  apiClient.post = originalPost;
  apiClient.put = originalPut;
});

test('VAT settings fall back to a safe default when no settings resources exist', async () => {
  apiClient.get = async <T>(): Promise<T> => ([] as T);
  assert.deepEqual(await fetchVatSettings(), {
    resourceId: null,
    settings: DEFAULT_VAT_SETTINGS,
  });
});

test('VAT settings parse and deduplicate saved Billing Entity identifiers', async () => {
  apiClient.get = async <T>(): Promise<T> => ([{
    id: 'vat-1',
    resource_name: 'SettingResource',
    inner_content: JSON.stringify({
      key: 'organization-vat',
      enabled: true,
      rate: 13.09,
      billingEntityIds: ['entity-1', 'entity-1', 'entity-2'],
    }),
  }] as T);

  assert.deepEqual(await fetchVatSettings(), {
    resourceId: 'vat-1',
    settings: {
      enabled: true,
      rate: 13.09,
      billingEntityIds: ['entity-1', 'entity-2'],
    },
  });
});

test('VAT settings update the generic SettingResource without losing entity applicability', async () => {
  let savedBody: Record<string, unknown> | undefined;
  apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
    savedBody = body as Record<string, unknown>;
    return undefined as T;
  };
  const settings = { enabled: true, rate: 13, billingEntityIds: ['entity-1'] };
  const saved = await saveVatSettings(settings, { resourceId: 'vat-1', settings: DEFAULT_VAT_SETTINGS });

  assert.equal(saved.resourceId, 'vat-1');
  assert.deepEqual(saved.settings, settings);
  assert.equal(savedBody?.resource_name, 'SettingResource');
  assert.deepEqual(savedBody?.inner_content, { key: 'organization-vat', ...settings });
});

test('VAT settings reject out-of-range rates and duplicate entity identifiers are removed on create', async () => {
  await assert.rejects(
    saveVatSettings({ enabled: true, rate: 100.01, billingEntityIds: [] }, { resourceId: null, settings: DEFAULT_VAT_SETTINGS }),
    /VAT दर ० देखि १००/u,
  );

  let savedBody: Record<string, unknown> | undefined;
  apiClient.post = async <T>(_path: string, body?: unknown): Promise<T> => {
    savedBody = body as Record<string, unknown>;
    return { id: 'vat-new' } as T;
  };
  await saveVatSettings(
    { enabled: false, rate: 13, billingEntityIds: ['entity-1', 'entity-1'] },
    { resourceId: null, settings: DEFAULT_VAT_SETTINGS },
  );
  assert.deepEqual(
    (savedBody?.inner_content as { billingEntityIds: string[] }).billingEntityIds,
    ['entity-1'],
  );
});
