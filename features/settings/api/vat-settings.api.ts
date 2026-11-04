import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface VatSettings {
  enabled: boolean;
  rate: number;
  billingEntityIds: string[];
}

export interface VatSettingsDocument {
  resourceId: string | null;
  settings: VatSettings;
}

export const DEFAULT_VAT_SETTINGS: VatSettings = {
  enabled: false,
  rate: 13,
  billingEntityIds: [],
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function getRows(value: unknown): JsonRecord[] {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : Array.isArray(item) ? getRows(item) : [];
    });
  }
  const record = asRecord(parsed);
  if (!record) throw new Error('VAT सेटिङ पढ्न सकिएन।');
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return getRows(record[key]);
  }
  if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
  throw new Error('VAT सेटिङ पढ्न सकिएन।');
}

function getResourceId(record: JsonRecord): string | null {
  const id = record.id ?? record.resourceId ?? record.resource_id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function responseResourceId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = getResourceId(record);
  if (id) return id;
  for (const key of ['data', 'result', 'resource']) {
    const nestedId = responseResourceId(record[key]);
    if (nestedId) return nestedId;
  }
  return null;
}

function parseSetting(record: JsonRecord): VatSettingsDocument | null {
  const content = asRecord(parseJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'organization-vat') return null;
  if (typeof content.enabled !== 'boolean'
    || typeof content.rate !== 'number'
    || !Number.isFinite(content.rate)
    || !Array.isArray(content.billingEntityIds)
    || content.billingEntityIds.some((id) => typeof id !== 'string')) {
    throw new Error('सुरक्षित गरिएको VAT सेटिङ अमान्य छ।');
  }
  const resourceId = getResourceId(record);
  if (!resourceId) throw new Error('VAT सेटिङको resource ID भेटिएन।');
  return {
    resourceId,
    settings: {
      enabled: content.enabled,
      rate: content.rate,
      billingEntityIds: [...new Set(content.billingEntityIds as string[])],
    },
  };
}

export async function fetchVatSettings(): Promise<VatSettingsDocument> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
  } catch (error) {
    if (error instanceof Error
      && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*SettingResource\b/iu.test(error.message)) {
      return { resourceId: null, settings: DEFAULT_VAT_SETTINGS };
    }
    throw error;
  }
  const matches = getRows(payload)
    .map(parseSetting)
    .filter((setting): setting is VatSettingsDocument => setting !== null);
  if (matches.length > 1) throw new Error('एकभन्दा बढी VAT सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_VAT_SETTINGS };
}

export async function saveVatSettings(
  settings: VatSettings,
  current: VatSettingsDocument,
): Promise<VatSettingsDocument> {
  if (!Number.isFinite(settings.rate) || settings.rate < 0 || settings.rate > 100) {
    throw new Error('VAT दर ० देखि १०० बीच हुनुपर्छ।');
  }
  const normalizedSettings = {
    enabled: settings.enabled,
    rate: settings.rate,
    billingEntityIds: [...new Set(settings.billingEntityIds.map((id) => id.trim()).filter(Boolean))],
  };
  const request = {
    resource_name: 'SettingResource',
    inner_content: {
      key: 'organization-vat',
      ...normalizedSettings,
    },
    external_content: null,
  };

  if (current.resourceId) {
    const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
    await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
    return { resourceId: current.resourceId, settings: normalizedSettings };
  }

  const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
  const resourceId = responseResourceId(created);
  if (!resourceId) throw new Error('VAT सेटिङ सुरक्षित गर्दा resource ID प्राप्त भएन।');
  return { resourceId, settings: normalizedSettings };
}
