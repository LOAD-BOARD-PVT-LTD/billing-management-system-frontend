import type {
  SmsProviderConfig,
  SmsTemplate,
  SmsTemplatesSettings,
} from '@/features/notifications/types';
import {
  DEFAULT_SAMAYASMS_BASE_URL,
  DEFAULT_SMS_PROVIDER_CONFIG,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_SMS_TEMPLATES,
  validateSmsProviderConfig,
  validateSmsTemplatesSettings,
} from '@/features/notifications/utils/notification-settings-validation';
import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export {
  DEFAULT_SAMAYASMS_BASE_URL,
  DEFAULT_SMS_PROVIDER_CONFIG,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_SMS_TEMPLATES,
  validateSmsProviderConfig,
  validateSmsTemplatesSettings,
};

export interface NotificationSettingsDocument {
  resourceId: string | null;
  settings: SmsTemplatesSettings;
}

function parseLegacySettings(record: JsonRecord): SmsTemplatesSettings | null {
  const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'notification-management') return null;
  return validateSmsTemplatesSettings(content);
}

export async function fetchNotificationSettings(): Promise<NotificationSettingsDocument> {
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords) || grouped.needsMigration) {
    return {
      resourceId: grouped.resourceId,
      settings: grouped.settings.smsSettings,
    };
  }

  const matches = grouped.rawRecords.flatMap((record): NotificationSettingsDocument[] => {
    const settings = parseLegacySettings(record);
    if (!settings) return [];
    const resourceId = getSettingResourceId(record);
    if (!resourceId) throw new Error('सूचना सेटिङको resource ID भेटिएन।');
    return [{ resourceId, settings }];
  });
  if (matches.length > 1) throw new Error('सूचना व्यवस्थापनका एकभन्दा बढी सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_SMS_SETTINGS };
}

export async function saveNotificationSettings(
  settings: SmsTemplatesSettings,
  current: NotificationSettingsDocument,
): Promise<NotificationSettingsDocument> {
  const validatedSettings = validateSmsTemplatesSettings(settings, { strictProvider: true });
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, smsSettings: validatedSettings }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings: validatedSettings };
}

export async function saveSmsProviderConfig(
  providerConfig: SmsProviderConfig,
  current: NotificationSettingsDocument,
): Promise<NotificationSettingsDocument> {
  const validatedProvider = validateSmsProviderConfig(providerConfig, { strict: true });
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({
      ...grouped,
      smsSettings: {
        ...grouped.smsSettings,
        ...validatedProvider,
      },
    }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings: saved.settings.smsSettings };
}

export async function saveSmsTemplates(
  templates: SmsTemplate[],
  current: NotificationSettingsDocument,
): Promise<NotificationSettingsDocument> {
  const validatedTemplates = validateSmsTemplatesSettings(
    { ...current.settings, templates },
    { strictProvider: false },
  ).templates;
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({
      ...grouped,
      smsSettings: {
        ...grouped.smsSettings,
        templates: validatedTemplates,
      },
    }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings: saved.settings.smsSettings };
}
