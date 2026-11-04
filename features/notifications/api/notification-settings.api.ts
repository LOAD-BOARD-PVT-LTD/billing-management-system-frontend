import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type {
  NotificationAutomationRule,
  NotificationCategory,
  NotificationChannel,
  NotificationManagementSettings,
  NotificationTemplate,
} from '@/features/notifications/types';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationManagementSettings = {
  templates: [
    {
      id: 'payment-received',
      name: 'भुक्तानी प्राप्त',
      category: 'Billing',
      content: 'तपाईंको सवारी नम्बर {vehicleNumber} को रकम रु {amount} प्राप्त भएको छ।\nधन्यवाद। {organizationName}\nम्याद सकिने मिति: {expiryDate}',
      channel: 'SMS',
      active: true,
    },
    {
      id: 'payment-reminder',
      name: 'भुक्तानी रिमाइन्डर',
      category: 'Billing',
      content: 'नमस्कार, सवारी नम्बर {vehicleNumber} को रु {amount} भुक्तानी बाँकी छ। कृपया {dueDate} भित्र भुक्तानी गर्नुहोस्।\n{organizationName}',
      channel: 'SMS',
      active: true,
    },
    {
      id: 'urgent-reminder',
      name: 'अत्यावश्यक रिमाइन्डर',
      category: 'Billing',
      content: 'अत्यावश्यक सूचना: सवारी नम्बर {vehicleNumber} को भुक्तानी म्याद {dueDate} मा सकिँदैछ। सेवा निरन्तरताका लागि समयमै भुक्तानी गर्नुहोस्।\n{organizationName}',
      channel: 'SMS',
      active: false,
    },
  ],
  automationRules: [
    {
      id: 'rule-bill',
      name: 'बिल तयार भएपछि',
      description: 'नयाँ बिल सफलतापूर्वक तयार हुँदा सम्बन्धित व्यक्तिलाई सूचना पठाउने।',
      enabled: true,
      template: 'बिल तयार भएको सूचना',
    },
    {
      id: 'rule-payment',
      name: 'भुक्तानी प्राप्त भएपछि',
      description: 'भुक्तानी प्राप्त भएपछि रसिद वा भुक्तानी पुष्टि सन्देश पठाउने।',
      enabled: true,
      template: 'भुक्तानी प्राप्त',
    },
    {
      id: 'rule-overdue',
      name: 'भुक्तानी म्याद नजिकिँदा',
      description: 'भुक्तानीको अन्तिम मिति अघि सम्झना सन्देश पठाउने।',
      enabled: false,
      template: 'भुक्तानी रिमाइन्डर',
    },
  ],
};

export interface NotificationSettingsDocument {
  resourceId: string | null;
  settings: NotificationManagementSettings;
}

type JsonRecord = Record<string, unknown>;

const categories: NotificationCategory[] = ['Billing', 'Member', 'Vehicle', 'System'];
const channels: NotificationChannel[] = ['SMS', 'In-app', 'Email'];

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
  if (!record) throw new Error('सूचना सेटिङ पढ्न सकिएन।');
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return getRows(record[key]);
  }
  if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
  throw new Error('सूचना सेटिङ पढ्न सकिएन।');
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

function isNoSettingsFoundError(error: unknown): boolean {
  return error instanceof Error
    && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*SettingResource\b/iu.test(error.message);
}

function parseTemplate(value: unknown): NotificationTemplate {
  const record = asRecord(value);
  if (!record
    || typeof record.id !== 'string'
    || typeof record.name !== 'string'
    || !categories.includes(record.category as NotificationCategory)
    || !channels.includes(record.channel as NotificationChannel)
    || typeof record.content !== 'string'
    || typeof record.active !== 'boolean') {
    throw new Error('सूचना टेम्प्लेटको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  return {
    id: record.id,
    name: record.name,
    category: record.category as NotificationCategory,
    content: record.content,
    channel: record.channel as NotificationChannel,
    active: record.active,
  };
}

function parseAutomationRule(value: unknown): NotificationAutomationRule {
  const record = asRecord(value);
  if (!record
    || typeof record.id !== 'string'
    || typeof record.name !== 'string'
    || typeof record.description !== 'string'
    || typeof record.enabled !== 'boolean'
    || typeof record.template !== 'string') {
    throw new Error('स्वचालित सूचना नियमको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    enabled: record.enabled,
    template: record.template,
  };
}

export function validateNotificationSettings(
  value: unknown,
): NotificationManagementSettings {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.templates) || !Array.isArray(record.automationRules)) {
    throw new Error('सूचना सेटिङको ढाँचा अमान्य छ।');
  }
  if (record.templates.length === 0) throw new Error('कम्तीमा एउटा सूचना टेम्प्लेट आवश्यक छ।');
  const templates = record.templates.map(parseTemplate);
  const automationRules = record.automationRules.map(parseAutomationRule);
  const templateIds = new Set<string>();
  for (const template of templates) {
    if (!template.id.trim() || !template.name.trim()) {
      throw new Error('हरेक टेम्प्लेटमा नाम र पहिचान आवश्यक छ।');
    }
    if (templateIds.has(template.id)) throw new Error('एउटै टेम्प्लेट पहिचान दोहोरिएको छ।');
    templateIds.add(template.id);
  }
  const ruleIds = new Set<string>();
  for (const rule of automationRules) {
    if (!rule.id.trim() || !rule.name.trim()) {
      throw new Error('हरेक स्वचालित सूचना नियममा नाम र पहिचान आवश्यक छ।');
    }
    if (ruleIds.has(rule.id)) throw new Error('एउटै स्वचालित सूचना नियम दोहोरिएको छ।');
    ruleIds.add(rule.id);
  }
  return { templates, automationRules };
}

function parseSettings(record: JsonRecord): NotificationManagementSettings | null {
  const content = asRecord(parseJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'notification-management') return null;
  if (!Array.isArray(content.templates) || !Array.isArray(content.automationRules)) {
    throw new Error('सूचना सेटिङको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  return validateNotificationSettings({
    templates: content.templates.map(parseTemplate),
    automationRules: content.automationRules.map(parseAutomationRule),
  });
}

export async function fetchNotificationSettings(): Promise<NotificationSettingsDocument> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
  } catch (error) {
    if (isNoSettingsFoundError(error)) {
      return { resourceId: null, settings: DEFAULT_NOTIFICATION_SETTINGS };
    }
    throw error;
  }

  const matches = getRows(payload).flatMap((record): NotificationSettingsDocument[] => {
    const settings = parseSettings(record);
    if (!settings) return [];
    const resourceId = getResourceId(record);
    if (!resourceId) throw new Error('सूचना सेटिङको resource ID भेटिएन।');
    return [{ resourceId, settings }];
  });
  if (matches.length > 1) throw new Error('सूचना व्यवस्थापनका एकभन्दा बढी सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_NOTIFICATION_SETTINGS };
}

export async function saveNotificationSettings(
  settings: NotificationManagementSettings,
  current: NotificationSettingsDocument,
): Promise<NotificationSettingsDocument> {
  const validatedSettings = validateNotificationSettings(settings);
  const request = {
    resource_name: 'SettingResource',
    inner_content: {
      key: 'notification-management',
      templates: validatedSettings.templates,
      automationRules: validatedSettings.automationRules,
    },
    external_content: null,
  };

  if (current.resourceId) {
    const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
    await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
    return { resourceId: current.resourceId, settings: validatedSettings };
  }

  const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
  const resourceId = getResponseResourceId(created);
  if (!resourceId) throw new Error('सूचना सेटिङ सुरक्षित गर्दा resource ID प्राप्त भएन।');
  return { resourceId, settings: validatedSettings };
}
