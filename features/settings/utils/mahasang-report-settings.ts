export interface MahasangVehicleTypeGroup {
  id: string;
  name: string;
  vehicleTypes: string[];
}

export interface MahasangReportSettings {
  defaultGroupId: string;
  defaultVehicleTypes: string[];
  vehicleTypeGroups: MahasangVehicleTypeGroup[];
}

export const DEFAULT_MAHASANG_REPORT_SETTINGS: MahasangReportSettings = {
  defaultGroupId: '',
  defaultVehicleTypes: [],
  vehicleTypeGroups: [],
};

function asObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeVehicleTypeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const uniqueByKey = new Map<string, string>();
  for (const raw of values) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase();
    if (!uniqueByKey.has(key)) {
      uniqueByKey.set(key, trimmed);
    }
  }
  return Array.from(uniqueByKey.values());
}

export function normalizeMahasangReportSettings(raw: unknown): MahasangReportSettings {
  const record = asObjectRecord(raw);
  if (!record) return { ...DEFAULT_MAHASANG_REPORT_SETTINGS };

  const groupsRaw = Array.isArray(record.vehicleTypeGroups) ? record.vehicleTypeGroups : [];
  const groupsById = new Map<string, MahasangVehicleTypeGroup>();
  const seenNames = new Set<string>();

  groupsRaw.forEach((item, index) => {
    const groupRecord = asObjectRecord(item);
    if (!groupRecord) return;
    const name = typeof groupRecord.name === 'string' ? groupRecord.name.trim() : '';
    if (!name) return;
    const nameKey = name.toLocaleLowerCase();
    if (seenNames.has(nameKey)) return;
    seenNames.add(nameKey);

    const rawId = typeof groupRecord.id === 'string' ? groupRecord.id.trim() : '';
    const id = rawId && !groupsById.has(rawId) ? rawId : `group-${index + 1}`;
    groupsById.set(id, {
      id,
      name,
      vehicleTypes: normalizeVehicleTypeList(groupRecord.vehicleTypes),
    });
  });

  const vehicleTypeGroups = Array.from(groupsById.values());
  const rawDefaultGroupId = typeof record.defaultGroupId === 'string' ? record.defaultGroupId.trim() : '';
  const defaultGroupId = vehicleTypeGroups.some((group) => group.id === rawDefaultGroupId)
    ? rawDefaultGroupId
    : '';

  return {
    defaultGroupId,
    defaultVehicleTypes: normalizeVehicleTypeList(record.defaultVehicleTypes),
    vehicleTypeGroups,
  };
}

export function resolveDefaultMahasangVehicleTypes(
  settings: MahasangReportSettings | null | undefined,
): string[] {
  if (!settings) return [];
  if (settings.defaultGroupId) {
    const matchedGroup = settings.vehicleTypeGroups.find((group) => group.id === settings.defaultGroupId);
    if (matchedGroup) {
      return [...matchedGroup.vehicleTypes];
    }
  }
  return [...settings.defaultVehicleTypes];
}
