import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

type JsonRecord = Record<string, unknown>;

export type DisplacedTaggingSetting = {
  resourceId: string | null;
  enabled: boolean;
};

export const DEFAULT_DISPLACED_TAGGING_SETTING: DisplacedTaggingSetting = {
  resourceId: null,
  enabled: true,
};

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
  if (!record) throw new Error('विस्थापित ट्याग सेटिङ पढ्न सकिएन।');
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return getRows(record[key]);
  }
  if (record.resource_name === 'SettingResource' || record.resourceName === 'SettingResource') return [record];
  if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
  throw new Error('विस्थापित ट्याग सेटिङ पढ्न सकिएन।');
}

function getResourceId(record: JsonRecord): string | null {
  const value = record.id ?? record.resourceId ?? record.resource_id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function getResponseResourceId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = getResourceId(record);
  if (id) return id;
  for (const key of ['data', 'result', 'resource']) {
    const nestedId = getResponseResourceId(record[key]);
    if (nestedId) return nestedId;
  }
  return null;
}

function parseSetting(record: JsonRecord): DisplacedTaggingSetting | null {
  const content = asRecord(parseJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'displaced-tagging') return null;
  if (typeof content.enabled !== 'boolean') {
    throw new Error('विस्थापित ट्याग सेटिङको अवस्था अमान्य छ।');
  }
  const resourceId = getResourceId(record);
  if (!resourceId) throw new Error('विस्थापित ट्याग सेटिङको resource ID भेटिएन।');
  return { resourceId, enabled: content.enabled };
}

export async function fetchDisplacedTaggingSetting(): Promise<DisplacedTaggingSetting> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
  } catch (error) {
    if (
      error instanceof Error
      && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*SettingResource\b/iu.test(error.message)
    ) {
      return DEFAULT_DISPLACED_TAGGING_SETTING;
    }
    throw error;
  }

  const matches = getRows(payload).flatMap((record) => {
    const setting = parseSetting(record);
    return setting ? [setting] : [];
  });
  if (matches.length > 1) throw new Error('विस्थापित ट्यागका एकभन्दा बढी सेटिङ भेटिए।');
  return matches[0] ?? DEFAULT_DISPLACED_TAGGING_SETTING;
}

export async function saveDisplacedTaggingSetting(
  enabled: boolean,
  current: DisplacedTaggingSetting,
): Promise<DisplacedTaggingSetting> {
  const request = {
    resource_name: 'SettingResource',
    inner_content: {
      key: 'displaced-tagging',
      enabled,
    },
    external_content: null,
  };

  if (current.resourceId) {
    const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
    await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
    return { resourceId: current.resourceId, enabled };
  }

  const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
  const resourceId = getResponseResourceId(created);
  if (!resourceId) throw new Error('विस्थापित ट्याग सेटिङ सुरक्षित गर्दा resource ID प्राप्त भएन।');
  return { resourceId, enabled };
}
