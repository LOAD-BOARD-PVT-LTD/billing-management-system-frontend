import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import type { TqmsRegistryVehicle } from '@/features/vehicle/tqms/model/tqms-member-registry';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
}

function getVehicles(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload.flatMap(getVehicles);
  const record = asRecord(payload);
  if (!record) return [];

  if (record.resource_name === 'VehicleResource' && asRecord(record.inner_content)) return [record];
  if (asRecord(record.inner_content) && ('VehicleId' in (record.inner_content as JsonRecord) || 'VehicleNumber' in (record.inner_content as JsonRecord))) return [record];

  for (const key of ['data', 'Data', 'results', 'Results', 'items', 'Items', 'records', 'Records', 'resources', 'Resources', 'vehicles', 'Vehicles']) {
    const nested = record[key];
    if (Array.isArray(nested)) return getVehicles(nested);
    if (asRecord(nested)) {
      const vehicles = getVehicles(nested);
      if (vehicles.length) return vehicles;
    }
  }
  return [];
}

function normalizeVehicle(value: unknown): TqmsRegistryVehicle | null {
  const resource = asRecord(value);
  const content = asRecord(resource?.inner_content) ?? resource;
  if (!content) return null;

  const vehicleNumber = text(content.VehicleNumber ?? content.vehicleNumber);
  const vehicleId = text(content.VehicleId ?? content.vehicleId ?? resource?.id ?? resource?.ID);
  if (!vehicleNumber && !vehicleId) return null;

  const owners = Array.isArray(content.Owners) ? content.Owners.map(asRecord).filter((owner): owner is JsonRecord => owner !== null) : [];
  const vehicleOwner = owners.length > 1 ? owners[1] : owners[0];
  const operator = owners.length > 1 ? owners[0] : null;
  const registration = asRecord(content.Registration);
  const citizenship = vehicleOwner?.CitizenshipNumber;

  return {
    id: text(resource?.id ?? resource?.ID ?? vehicleId ?? vehicleNumber),
    vehicleId,
    vehicleNumber: vehicleNumber || '—',
    normalizedVehicleNumber: text(content.NormalizedVehicleNumber),
    vehicleType: text(content.VehicleType ?? content.vehicleType) || '—',
    vehicleOwnerName: text(vehicleOwner?.Name) || '—',
    operatorName: operator ? text(operator.Name) || null : null,
    phone: text(vehicleOwner?.Phone),
    branch: text(vehicleOwner?.SanghBranch),
    status: text(registration?.Status ?? content.Status) || '—',
    address: text(vehicleOwner?.Address),
    citizenshipNumber: typeof citizenship === 'string' || typeof citizenship === 'number' ? String(citizenship) : '',
    isDummyPhoneUsed: vehicleOwner?.IsDummyPhoneUsed === true,
  };
}

export function parseTqmsMemberRegistry(payload: unknown): TqmsRegistryVehicle[] {
  const rows = getVehicles(payload);
  return rows.map(normalizeVehicle).filter((vehicle): vehicle is TqmsRegistryVehicle => vehicle !== null);
}

export async function fetchTqmsMemberRegistry(signal?: AbortSignal, branchName = ''): Promise<TqmsRegistryVehicle[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(
      branchName.trim()
        ? endpoints.resources.vehicle.search('SanghBranch', branchName, 'all')
        : endpoints.resources.vehicle.list(),
      { signal },
    );
  } catch (error) {
    if (error instanceof Error && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*VehicleResource\b/iu.test(error.message)) {
      return [];
    }
    if (error instanceof Error && /Request failed \(404\).*No resources found for search query/iu.test(error.message)) {
      return [];
    }
    throw error;
  }
  return parseTqmsMemberRegistry(payload)
    .filter((vehicle) => matchesTqmsSanghBranch(vehicle.branch, branchName));
}