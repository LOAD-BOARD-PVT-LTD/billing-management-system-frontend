import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

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

function parseLegacySetting(record: JsonRecord): VatSettingsDocument | null {
  const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'organization-vat') return null;
  if (typeof content.enabled !== 'boolean'
    || typeof content.rate !== 'number'
    || !Number.isFinite(content.rate)
    || !Array.isArray(content.billingEntityIds)
    || content.billingEntityIds.some((id) => typeof id !== 'string')) {
    throw new Error('सुरक्षित गरिएको VAT सेटिङ अमान्य छ।');
  }
  const resourceId = getSettingResourceId(record);
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
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords)) {
    return {
      resourceId: grouped.resourceId,
      settings: grouped.settings.vat,
    };
  }

  const matches = grouped.rawRecords
    .map(parseLegacySetting)
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
  const normalizedSettings: VatSettings = {
    enabled: settings.enabled,
    rate: settings.rate,
    billingEntityIds: [...new Set(settings.billingEntityIds.map((id) => id.trim()).filter(Boolean))],
  };
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, vat: normalizedSettings }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings: normalizedSettings };
}
