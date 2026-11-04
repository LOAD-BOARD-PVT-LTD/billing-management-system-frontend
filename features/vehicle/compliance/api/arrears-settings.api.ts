import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface ArrearsRuleSettings {
  paidExpired: {
    enabled: boolean;
    billingRuleId: string;
  };
  monthlyPaid: {
    enabled: boolean;
    fiscalYearId: string;
    billingRuleId: string;
  };
}

export interface ArrearsRuleSettingsDocument {
  resourceId: string | null;
  settings: ArrearsRuleSettings;
}

export const DEFAULT_ARREARS_RULE_SETTINGS: ArrearsRuleSettings = {
  paidExpired: { enabled: false, billingRuleId: '' },
  monthlyPaid: { enabled: false, fiscalYearId: '', billingRuleId: '' },
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
  if (!record) throw new Error('बक्यौता नियम सेटिङ पढ्न सकिएन।');
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return getRows(record[key]);
  }
  if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
  throw new Error('बक्यौता नियम सेटिङ पढ्न सकिएन।');
}

function getResourceId(record: JsonRecord): string | null {
  const value = record.id ?? record.resourceId ?? record.resource_id;
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function nestedResourceId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = getResourceId(record);
  if (id) return id;
  for (const key of ['data', 'result', 'resource']) {
    const nested = nestedResourceId(record[key]);
    if (nested) return nested;
  }
  return null;
}

function parseSettings(value: JsonRecord): ArrearsRuleSettings | null {
  const content = asRecord(parseJson(value.inner_content ?? value.innerContent));
  if (content?.key !== 'arrears-list-rules') return null;
  const paidExpired = asRecord(content.paidExpired);
  const monthlyPaid = asRecord(content.monthlyPaid);
  if (!paidExpired || !monthlyPaid
    || typeof paidExpired.enabled !== 'boolean'
    || typeof paidExpired.billingRuleId !== 'string'
    || typeof monthlyPaid.enabled !== 'boolean'
    || typeof monthlyPaid.fiscalYearId !== 'string'
    || typeof monthlyPaid.billingRuleId !== 'string') {
    throw new Error('बक्यौता नियमको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  return {
    paidExpired: {
      enabled: paidExpired.enabled,
      billingRuleId: paidExpired.billingRuleId,
    },
    monthlyPaid: {
      enabled: monthlyPaid.enabled,
      fiscalYearId: monthlyPaid.fiscalYearId,
      billingRuleId: monthlyPaid.billingRuleId,
    },
  };
}

function isNoSettingsFoundError(error: unknown): boolean {
  return error instanceof Error
    && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*SettingResource\b/iu.test(error.message);
}

export async function fetchArrearsRuleSettings(): Promise<ArrearsRuleSettingsDocument> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
  } catch (error) {
    if (isNoSettingsFoundError(error)) {
      return { resourceId: null, settings: DEFAULT_ARREARS_RULE_SETTINGS };
    }
    throw error;
  }
  const matches = getRows(payload).flatMap((record): ArrearsRuleSettingsDocument[] => {
    const settings = parseSettings(record);
    if (!settings) return [];
    const resourceId = getResourceId(record);
    if (!resourceId) throw new Error('बक्यौता नियम सेटिङको resource ID भेटिएन।');
    return [{ resourceId, settings }];
  });
  if (matches.length > 1) throw new Error('बक्यौता नियमका एकभन्दा बढी सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_ARREARS_RULE_SETTINGS };
}

export async function saveArrearsRuleSettings(
  settings: ArrearsRuleSettings,
  current: ArrearsRuleSettingsDocument,
): Promise<ArrearsRuleSettingsDocument> {
  if (settings.paidExpired.enabled && !settings.paidExpired.billingRuleId) {
    throw new Error('तिरेको तर म्याद सकिएको सूचीका लागि बिलिङ नियम छान्नुहोस्।');
  }
  if (settings.monthlyPaid.enabled && (!settings.monthlyPaid.fiscalYearId || !settings.monthlyPaid.billingRuleId)) {
    throw new Error('मासिक तिरेको सूचीका लागि आर्थिक वर्ष र बिलिङ नियम छान्नुहोस्।');
  }

  const request = {
    resource_name: 'SettingResource',
    inner_content: {
      key: 'arrears-list-rules',
      paidExpired: settings.paidExpired,
      monthlyPaid: settings.monthlyPaid,
    },
    external_content: null,
  };
  if (current.resourceId) {
    const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
    await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
    return { resourceId: current.resourceId, settings };
  }
  const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
  const resourceId = nestedResourceId(created);
  if (!resourceId) throw new Error('बक्यौता नियम सुरक्षित गर्दा resource ID प्राप्त भएन।');
  return { resourceId, settings };
}
