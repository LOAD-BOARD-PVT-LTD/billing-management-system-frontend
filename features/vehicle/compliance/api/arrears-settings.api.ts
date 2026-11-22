import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

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

function parseLegacySettings(value: JsonRecord): ArrearsRuleSettings | null {
  const content = asSettingRecord(parseSettingJson(value.inner_content ?? value.innerContent));
  if (content?.key !== 'arrears-list-rules') return null;
  const paidExpired = asSettingRecord(content.paidExpired);
  const monthlyPaid = asSettingRecord(content.monthlyPaid);
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

export async function fetchArrearsRuleSettings(): Promise<ArrearsRuleSettingsDocument> {
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords)) {
    return {
      resourceId: grouped.resourceId,
      settings: grouped.settings.arrears,
    };
  }

  const matches = grouped.rawRecords.flatMap((record): ArrearsRuleSettingsDocument[] => {
    const settings = parseLegacySettings(record);
    if (!settings) return [];
    const resourceId = getSettingResourceId(record);
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

  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, arrears: settings }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings };
}
