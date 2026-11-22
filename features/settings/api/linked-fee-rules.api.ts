import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export interface LinkedFeeRule {
  id: string;
  fiscalYearId: string;
  sourceFeeHeadId: string;
  linkedFeeHeadId: string;
  active: boolean;
  oncePerFiscalYear: boolean;
}

export interface LinkedFeeRulesSettings {
  enabled: boolean;
  rules: LinkedFeeRule[];
}

export interface LinkedFeeRulesDocument {
  resourceId: string | null;
  settings: LinkedFeeRulesSettings;
}

export const DEFAULT_LINKED_FEE_RULES_SETTINGS: LinkedFeeRulesSettings = {
  enabled: false,
  rules: [],
};

function parseLegacySettings(value: JsonRecord): LinkedFeeRulesSettings | null {
  const content = asSettingRecord(parseSettingJson(value.inner_content ?? value.innerContent));
  if (content?.key !== 'linked-fee-rules') return null;
  if (typeof content.enabled !== 'boolean' || !Array.isArray(content.rules)) {
    throw new Error('जोडिएको शुल्क नियमको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  const rules = content.rules.map((item): LinkedFeeRule => {
    const rule = asSettingRecord(item);
    if (!rule
      || typeof rule.id !== 'string'
      || typeof rule.fiscalYearId !== 'string'
      || typeof rule.sourceFeeHeadId !== 'string'
      || typeof rule.linkedFeeHeadId !== 'string'
      || typeof rule.active !== 'boolean'
      || typeof rule.oncePerFiscalYear !== 'boolean') {
      throw new Error('जोडिएको शुल्क नियमको एउटा विवरण अमान्य छ।');
    }
    return {
      id: rule.id,
      fiscalYearId: rule.fiscalYearId,
      sourceFeeHeadId: rule.sourceFeeHeadId,
      linkedFeeHeadId: rule.linkedFeeHeadId,
      active: rule.active,
      oncePerFiscalYear: rule.oncePerFiscalYear,
    };
  });
  return { enabled: content.enabled, rules };
}

export function validateLinkedFeeRules(settings: LinkedFeeRulesSettings): void {
  const seenPairs = new Set<string>();
  for (const rule of settings.rules) {
    if (!rule.fiscalYearId || !rule.sourceFeeHeadId || !rule.linkedFeeHeadId) {
      throw new Error('प्रत्येक नियममा आर्थिक वर्ष, स्रोत शुल्क र जोडिने शुल्क छान्नुहोस्।');
    }
    if (rule.sourceFeeHeadId === rule.linkedFeeHeadId) {
      throw new Error('स्रोत शुल्क र जोडिने शुल्क एउटै हुन मिल्दैन।');
    }
    const pairKey = `${rule.fiscalYearId}:${rule.sourceFeeHeadId}:${rule.linkedFeeHeadId}`;
    if (seenPairs.has(pairKey)) {
      throw new Error('एउटै आर्थिक वर्षमा उस्तै जोडिएको शुल्क नियम दोहोरिएको छ।');
    }
    seenPairs.add(pairKey);
  }
}

export async function fetchLinkedFeeRules(): Promise<LinkedFeeRulesDocument> {
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords)) {
    return {
      resourceId: grouped.resourceId,
      settings: grouped.settings.linkedFeeRules,
    };
  }

  const matches = grouped.rawRecords
    .map((value) => ({ resourceId: getSettingResourceId(value), settings: parseLegacySettings(value) }))
    .filter((value): value is { resourceId: string | null; settings: LinkedFeeRulesSettings } => value.settings !== null);
  if (matches.length > 1) throw new Error('एकभन्दा बढी जोडिएको शुल्क नियम सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_LINKED_FEE_RULES_SETTINGS };
}

export async function saveLinkedFeeRules(
  settings: LinkedFeeRulesSettings,
  current: LinkedFeeRulesDocument,
): Promise<LinkedFeeRulesDocument> {
  validateLinkedFeeRules(settings);
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, linkedFeeRules: settings }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings };
}
