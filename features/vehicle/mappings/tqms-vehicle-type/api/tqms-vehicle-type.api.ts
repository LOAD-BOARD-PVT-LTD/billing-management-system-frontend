import { apiClient } from '@/lib/api/client';

import type { TqmsVehicleTypeOption } from '@/features/vehicle/mappings/tqms-vehicle-type/types/tqms-vehicle-type.types';

function getNestedArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidateKeys = ['data', 'items', 'results', 'records', 'vehicleTypes', 'types', 'list', 'value'];

  for (const key of candidateKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === 'object') {
      const nested = getNestedArray(value);
      if (nested.length) {
        return nested;
      }
    }
  }

  return [];
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return undefined;
}

function normalizeTqmsVehicleType(raw: unknown): TqmsVehicleTypeOption | null {
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (!value) {
      return null;
    }

    return {
      id: value,
      name: value,
      code: value,
      category: undefined,
    };
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const name = pickString(record, ['vehicle_type', 'vehicleType', 'vehicleTypeName', 'name', 'typeName', 'label', 'title']) ?? pickString(record, ['description', 'typeDescription']);
  const code = pickString(record, ['code', 'vehicleTypeCode', 'typeCode', 'codeValue']) ?? pickString(record, ['id', 'vehicleTypeId', 'tqmsVehicleTypeId', 'typeId', 'vehicle_type']);
  const id = pickString(record, ['id', 'vehicleTypeId', 'tqmsVehicleTypeId', 'typeId', 'vehicle_type', 'code', 'vehicleTypeCode', 'typeCode']) ?? name ?? code;
  const category = pickString(record, ['category', 'vehicleCategory', 'typeCategory', 'categoryName', 'group']);
  const rawVehicleCount = record.vehicle_count ?? record.vehicleCount ?? record.count;
  const vehicleCount = rawVehicleCount === undefined ? undefined : Number(rawVehicleCount);

  if (!name && !code && !id) {
    return null;
  }

  return {
    id: id ?? name ?? code ?? 'unknown',
    name: name ?? code ?? id ?? 'Unknown vehicle type',
    code: code ?? id ?? name ?? 'N/A',
    category: category ?? undefined,
    vehicleCount: vehicleCount !== undefined && Number.isFinite(vehicleCount) ? vehicleCount : undefined,
  };
}

function normalizeTqmsVehicleTypeList(payload: unknown): TqmsVehicleTypeOption[] {
  const candidates = getNestedArray(payload);

  if (!candidates.length) {
    return [];
  }

  return candidates
    .map((item) => normalizeTqmsVehicleType(item))
    .filter((item): item is TqmsVehicleTypeOption => Boolean(item));
}

export async function fetchTqmsVehicleTypes(): Promise<TqmsVehicleTypeOption[]> {
  const payload = await apiClient.get<unknown>('read_all/VehicleTypes');
  return normalizeTqmsVehicleTypeList(payload);
}

export async function syncTqmsVehicleTypes(): Promise<void> {
  await apiClient.get<void>('tqms/sync');
}


