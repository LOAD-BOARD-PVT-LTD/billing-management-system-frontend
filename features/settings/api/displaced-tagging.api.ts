import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export type DisplacedTaggingSetting = {
  resourceId: string | null;
  enabled: boolean;
};

export const DEFAULT_DISPLACED_TAGGING_SETTING: DisplacedTaggingSetting = {
  resourceId: null,
  enabled: true,
};

function parseLegacySetting(record: JsonRecord): DisplacedTaggingSetting | null {
  const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
  if (content?.key !== 'displaced-tagging') return null;
  if (typeof content.enabled !== 'boolean') {
    throw new Error('विस्थापित ट्याग सेटिङको अवस्था अमान्य छ।');
  }
  const resourceId = getSettingResourceId(record);
  if (!resourceId) throw new Error('विस्थापित ट्याग सेटिङको resource ID भेटिएन।');
  return { resourceId, enabled: content.enabled };
}

export async function fetchDisplacedTaggingSetting(): Promise<DisplacedTaggingSetting> {
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords)) {
    return {
      resourceId: grouped.resourceId,
      enabled: grouped.settings.displacedTagging.enabled,
    };
  }

  const matches = grouped.rawRecords.flatMap((record) => {
    const setting = parseLegacySetting(record);
    return setting ? [setting] : [];
  });
  if (matches.length > 1) throw new Error('विस्थापित ट्यागका एकभन्दा बढी सेटिङ भेटिए।');
  return matches[0] ?? DEFAULT_DISPLACED_TAGGING_SETTING;
}

export async function saveDisplacedTaggingSetting(
  enabled: boolean,
  current: DisplacedTaggingSetting,
): Promise<DisplacedTaggingSetting> {
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, displacedTagging: { enabled } }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, enabled };
}
