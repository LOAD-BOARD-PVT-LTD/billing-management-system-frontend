import type { BillingVehicle } from '@/features/billing/model/types';
import {
  readVehicleResource,
  updateVehicleResource,
  type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VehicleBlacklistRecord, VehicleStatusMetadata } from '@/features/vehicle/blacklist';

type JsonRecord = Record<string, unknown>;

const EMPTY_METADATA: VehicleStatusMetadata = {
  isBlacklisted: false,
  blacklistedReason: null,
  blacklistedAt: null,
  tags: [],
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function parseExternalContent(value: unknown): JsonRecord {
  if (value === undefined || value === null) return {};
  if (typeof value === 'string') {
    try {
      const parsed = asRecord(JSON.parse(value));
      if (parsed) return parsed;
    } catch {
      throw new Error('VehicleResource external_content is not valid JSON.');
    }
    throw new Error('VehicleResource external_content is not a JSON object.');
  }
  const record = asRecord(value);
  if (!record) throw new Error('VehicleResource external_content is not an object.');
  return record;
}

function parseMetadata(value: unknown): VehicleStatusMetadata {
  if (value === undefined || value === null) return { ...EMPTY_METADATA, tags: [] };
  const metadata = asRecord(value);
  if (!metadata) throw new Error('VehicleResource metadata must be an object.');
  if (metadata.isBlacklisted !== undefined && typeof metadata.isBlacklisted !== 'boolean') {
    throw new Error('VehicleResource metadata.isBlacklisted must be a boolean.');
  }
  const tags = metadata.tags ?? [];
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
    throw new Error('VehicleResource metadata.tags must be a list of strings.');
  }
  return {
    isBlacklisted: metadata.isBlacklisted === true,
    blacklistedReason: asText(metadata.blacklistedReason) || null,
    blacklistedAt: asText(metadata.blacklistedAt) || null,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
  };
}

function getOwnerDetails(content: JsonRecord): JsonRecord | null {
  const owners = Array.isArray(content.Owners)
    ? content.Owners.map(asRecord).filter((owner): owner is JsonRecord => owner !== null)
    : [];
  return owners.find((owner) => asText(owner.Type).toLowerCase() === 'main owner') ?? owners[0] ?? null;
}

function mapResourceToStatusRecord(value: unknown): VehicleBlacklistRecord {
  const root = asRecord(value);
  const innerContent = asRecord(root?.inner_content ?? root?.innerContent);
  if (!root || !innerContent) throw new Error('VehicleResource metadata search returned a malformed resource.');
  if ((root.resource_name ?? root.resourceName) !== 'VehicleResource') {
    throw new Error('Vehicle status search returned a resource other than VehicleResource.');
  }
  const externalContent = parseExternalContent(root.external_content ?? root.externalContent);
  const metadata = parseMetadata(externalContent.metadata);
  const vehicleId = asText(innerContent.VehicleId);
  const resourceId = asText(root.id);
  if (!vehicleId || !resourceId) {
    throw new Error('VehicleResource is missing its resource id or TQMS VehicleId.');
  }
  const owner = getOwnerDetails(innerContent);
  return {
    id: resourceId,
    vehicleId,
    vehicleNumber: asText(innerContent.VehicleNumber ?? innerContent.NormalizedVehicleNumber),
    vehicleType: asText(innerContent.VehicleType),
    ownerName: asText(owner?.Name),
    phone: asText(owner?.Phone),
    branch: asText(owner?.SanghBranch),
    ...metadata,
  };
}

function unwrapResourceRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload.flatMap(unwrapResourceRows);
  const record = asRecord(payload);
  if (!record) return [];
  if (record.resource_name === 'VehicleResource' || record.resourceName === 'VehicleResource') {
    return [record];
  }
  for (const key of ['items', 'Items', 'records', 'Records', 'resources', 'Resources', 'data', 'Data', 'result', 'Result']) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested.flatMap(unwrapResourceRows);
    if (asRecord(nested)) {
      const rows = unwrapResourceRows(nested);
      if (rows.length) return rows;
    }
  }
  if (asRecord(record.inner_content ?? record.innerContent)) return [record];
  return [];
}

async function searchBlacklistedVehicles(): Promise<VehicleBlacklistRecord[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(
      endpoints.resources.vehicle.search('external_content.metadata.isBlacklisted', 'true'),
    );
  } catch (error) {
    if (error instanceof Error && /Request failed \(404\).*No resources found for search query/iu.test(error.message)) {
      return [];
    }
    throw error;
  }
  return unwrapResourceRows(payload).map(mapResourceToStatusRecord);
}

export async function fetchVehicleBlacklist(): Promise<VehicleBlacklistRecord[]> {
  const records = await searchBlacklistedVehicles();
  return records
    .filter((record) => record.isBlacklisted)
    .sort((left, right) => (right.blacklistedAt ?? '').localeCompare(left.blacklistedAt ?? ''));
}

function updateManagedTags(tags: string[], isBlacklisted: boolean): string[] {
  const customTags = tags.filter((tag) => tag.toLowerCase() !== 'blacklisted');
  return [...new Set([
    ...customTags,
    ...(isBlacklisted ? ['blacklisted'] : []),
  ])];
}

async function saveMetadata(
  resource: VehicleResourceDocument,
  metadataInput: VehicleStatusMetadata,
): Promise<void> {
  const metadata = parseMetadata(metadataInput);
  const externalContent = { ...resource.externalContent };
  delete externalContent.vehicleBlacklist;
  const existingMetadata = asRecord(externalContent.metadata) ?? {};
  const tags = updateManagedTags(metadata.tags, metadata.isBlacklisted);
  externalContent.metadata = {
    ...existingMetadata,
    ...metadata,
    tags,
  };
  await updateVehicleResource(resource, resource.innerContent, externalContent);
}

export async function createVehicleBlacklist(input: {
  vehicle: BillingVehicle;
  blacklistedReason: string;
  tags: string[];
  at: string;
}): Promise<void> {
  const vehicleId = input.vehicle.tqmsVehicleId.trim();
  if (!vehicleId) throw new Error('The selected vehicle is missing its TQMS VehicleId.');
  if (!input.blacklistedReason.trim()) {
    throw new Error('A blacklisting reason is required.');
  }
  const resource = await readVehicleResource(vehicleId, input.vehicle.vehicleNumber);
  const currentExternalContent = resource.externalContent;
  const currentMetadata = parseMetadata(currentExternalContent.metadata);
  if (currentMetadata.isBlacklisted) throw new Error('This vehicle is already blacklisted.');
  await saveMetadata(resource, {
    ...currentMetadata,
    isBlacklisted: true,
    blacklistedReason: input.blacklistedReason.trim(),
    blacklistedAt: input.at,
    tags: [...currentMetadata.tags, ...input.tags],
  });
}

export async function updateVehicleBlacklist(input: {
  vehicleId: string;
  vehicleNumber: string;
  metadata: VehicleStatusMetadata;
}): Promise<void> {
  if (!input.vehicleId.trim()) throw new Error('A TQMS VehicleId is required to update vehicle metadata.');
  const resource = await readVehicleResource(input.vehicleId, input.vehicleNumber);
  const existingMetadata = parseMetadata(resource.externalContent.metadata);
  const metadata = { ...existingMetadata, ...input.metadata };
  if (!metadata.isBlacklisted) {
    metadata.blacklistedReason = null;
    metadata.blacklistedAt = null;
  }
  await saveMetadata(resource, metadata);
}
