import {
  fetchGroupedSettingsDocument,
  updateGroupedSettingsSection,
} from '@/features/settings/api/grouped-settings.api';
import {
  DEFAULT_MAHASANG_REPORT_SETTINGS,
  normalizeMahasangReportSettings,
  normalizeVehicleTypeList,
  resolveDefaultMahasangVehicleTypes,
  type MahasangReportSettings,
  type MahasangVehicleTypeGroup,
} from '@/features/settings/utils/mahasang-report-settings';

export {
  DEFAULT_MAHASANG_REPORT_SETTINGS,
  normalizeMahasangReportSettings,
  normalizeVehicleTypeList,
  resolveDefaultMahasangVehicleTypes,
  type MahasangReportSettings,
  type MahasangVehicleTypeGroup,
};

export interface MahasangReportSettingsDocument {
  resourceId: string | null;
  settings: MahasangReportSettings;
}

export async function fetchMahasangReportSettings(): Promise<MahasangReportSettingsDocument> {
  const grouped = await fetchGroupedSettingsDocument();
  return {
    resourceId: grouped.resourceId,
    settings: grouped.settings.mahasangReport,
  };
}

export async function saveMahasangReportSettings(
  settings: MahasangReportSettings,
  current: MahasangReportSettingsDocument,
): Promise<MahasangReportSettingsDocument> {
  const seenNames = new Set<string>();
  const validatedGroups: MahasangVehicleTypeGroup[] = [];

  for (const group of settings.vehicleTypeGroups) {
    const name = group.name.trim();
    if (!name) {
      throw new Error('प्रत्येक सवारी प्रकार समूहको नाम अनिवार्य छ।');
    }
    const nameKey = name.toLocaleLowerCase();
    if (seenNames.has(nameKey)) {
      throw new Error(`"${name}" नामको समूह पहिले नै छ।`);
    }
    seenNames.add(nameKey);
    const id = group.id.trim();
    if (!id) {
      throw new Error('समूहको ID अमान्य छ।');
    }
    validatedGroups.push({
      id,
      name,
      vehicleTypes: normalizeVehicleTypeList(group.vehicleTypes),
    });
  }

  const normalized: MahasangReportSettings = {
    defaultGroupId: validatedGroups.some((group) => group.id === settings.defaultGroupId.trim())
      ? settings.defaultGroupId.trim()
      : '',
    defaultVehicleTypes: normalizeVehicleTypeList(settings.defaultVehicleTypes),
    vehicleTypeGroups: validatedGroups,
  };

  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, mahasangReport: normalized }),
    { resourceIdHint: current.resourceId },
  );

  return {
    resourceId: saved.resourceId,
    settings: normalized,
  };
}
