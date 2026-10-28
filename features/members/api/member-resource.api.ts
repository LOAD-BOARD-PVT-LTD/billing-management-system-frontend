import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { MemberResourceInput, MemberResourceRecord } from '@/features/members/model/member';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value) as unknown);
    } catch {
      throw new Error('MemberResource contains invalid JSON.');
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function unwrapRows(value: unknown): unknown[] {
  if (typeof value === 'string') {
    try {
      return unwrapRows(JSON.parse(value) as unknown);
    } catch {
      throw new Error('Could not read MemberResource list: invalid JSON.');
    }
  }
  if (Array.isArray(value)) return value.flatMap(unwrapRows);
  const record = asRecord(value);
  if (!record) throw new Error('Could not read MemberResource list.');
  if (record.resource_name === 'MemberResource' || record.resourceName === 'MemberResource') return [record];
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return unwrapRows(record[key]);
  }
  if (record.inner_content || record.innerContent) return [record];
  return [];
}

export function parseMemberResource(value: unknown): MemberResourceRecord {
  const resource = asRecord(value);
  const innerContent = asRecord(resource?.inner_content ?? resource?.innerContent);
  const resourceName = text(resource?.resource_name ?? resource?.resourceName);
  if (resourceName && resourceName !== 'MemberResource') {
    throw new Error(`Expected MemberResource, received ${resourceName}.`);
  }
  const id = text(resource?.id ?? resource?.ID);
  const vehicleId = text(innerContent?.vehicleId ?? innerContent?.VehicleId);
  const vehicleNumber = text(innerContent?.vehicleNumber ?? innerContent?.VehicleNumber);
  const statusText = text(innerContent?.status ?? innerContent?.Status).toUpperCase();
  const statusBeforeDisplaced = text(innerContent?.statusBeforeDisplaced).toUpperCase();
  const tags = Array.isArray(innerContent?.tags) ? innerContent.tags.map(text) : [];
  const isDisplaced = innerContent?.isDisplaced === true
    || statusText === 'DISPLACED'
    || tags.some((tag) => tag.toLowerCase() === 'displaced');
  const isBlacklisted = innerContent?.isBlacklisted === true
    || statusText === 'BLACKLISTED'
    || (isDisplaced && statusBeforeDisplaced === 'BLACKLISTED')
    || tags.some((tag) => tag.toLowerCase() === 'blacklisted');
  if (!resource || !innerContent || !id || !vehicleId) {
    throw new Error('MemberResource record is missing its ID or vehicle ID.');
  }
  return {
    id,
    vehicleId,
    vehicleNumber,
    status: text(innerContent.status ?? innerContent.Status),
    isDisplaced,
    isBlacklisted,
    reason: text(innerContent.reason),
    taggedAt: text(innerContent.taggedAt ?? innerContent.tagged_at),
    performedBy: text(innerContent.performedBy ?? innerContent.performed_by) || null,
    createdForDisplacement: innerContent.createdForDisplacement === true,
    statusBeforeDisplaced: text(innerContent.statusBeforeDisplaced),
    resource,
    innerContent,
  };
}

function isMissingResources(error: unknown): boolean {
  return error instanceof Error
    && /Request failed \(404\).*(?:No resources found for resource name|No resources found for search query)/iu.test(error.message);
}

export async function fetchMemberResources(signal?: AbortSignal): Promise<MemberResourceRecord[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.member.list(), { signal });
  } catch (error) {
    if (isMissingResources(error)) return [];
    throw error;
  }
  return unwrapRows(payload).map(parseMemberResource);
}

export async function searchMemberResources(field: string, value: string, limit: number | 'all' = 'all'): Promise<MemberResourceRecord[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.member.search(field, value, limit));
  } catch (error) {
    if (isMissingResources(error)) return [];
    throw error;
  }
  return unwrapRows(payload).map(parseMemberResource);
}

function resourceId(value: unknown): string {
  const record = asRecord(value);
  if (!record) return '';
  for (const key of ['id', 'resourceId', 'resource_id', 'ID']) {
    const id = text(record[key]);
    if (id) return id;
  }
  for (const key of ['data', 'result', 'resource']) {
    const id = resourceId(record[key]);
    if (id) return id;
  }
  return '';
}

function taggedContent(
  input: MemberResourceInput,
  innerContent: JsonRecord,
  statusBeforeDisplaced: string,
  isAlreadyDisplaced: boolean,
) {
  return {
    ...innerContent,
    vehicleId: input.vehicleId,
    vehicleNumber: input.vehicleNumber,
    status: 'DISPLACED',
    isDisplaced: true,
    statusBeforeDisplaced,
    displacementPrevious: isAlreadyDisplaced
      ? innerContent.displacementPrevious
      : {
        status: innerContent.status,
        isDisplaced: innerContent.isDisplaced,
        reason: innerContent.reason,
        taggedAt: innerContent.taggedAt,
        performedBy: innerContent.performedBy,
        tags: innerContent.tags,
      },
    reason: input.reason.trim(),
    taggedAt: input.taggedAt,
    performedBy: input.performedBy,
  };
}

export async function tagMemberDisplaced(
  input: MemberResourceInput,
  existing?: MemberResourceRecord,
): Promise<void> {
  const vehicleId = input.vehicleId.trim();
  if (!vehicleId) throw new Error('A billing vehicle ID is required to tag a member.');
  if (!input.reason.trim()) throw new Error('विस्थापितको कारण लेख्नुहोस्।');
  if (existing) {
    const current = await readMemberResource(existing.id);
    const statusBeforeDisplaced = current.isDisplaced ? current.statusBeforeDisplaced : current.status;
    await apiClient.put<void>(
      endpoints.resources.member.update(current.id),
      {
        ...current.resource,
        id: /^\d+$/u.test(current.id) ? Number(current.id) : current.id,
        resource_name: 'MemberResource',
        inner_content: taggedContent(input, current.innerContent, statusBeforeDisplaced, current.isDisplaced),
      },
    );
    return;
  }
  const created = await apiClient.post<unknown>(endpoints.resources.member.create(), {
    resource_name: 'MemberResource',
    inner_content: taggedContent(input, { createdForDisplacement: true }, '', false),
    external_content: null,
  });
  if (!resourceId(created)) throw new Error('The created MemberResource did not return a resource ID.');
}

export async function removeMemberDisplaced(record: MemberResourceRecord): Promise<void> {
  const current = await readMemberResource(record.id);
  if (current.createdForDisplacement) {
    await apiClient.delete<void>(endpoints.resources.member.delete(current.id));
    return;
  }
  const innerContent = { ...current.innerContent };
  const previous = asRecord(innerContent.displacementPrevious) ?? {};
  for (const key of ['status', 'isDisplaced', 'reason', 'taggedAt', 'performedBy', 'tags']) {
    if (key in previous) innerContent[key] = previous[key];
    else delete innerContent[key];
  }
  delete innerContent.statusBeforeDisplaced;
  delete innerContent.displacementPrevious;
  await apiClient.put<void>(
    endpoints.resources.member.update(current.id),
    {
      ...current.resource,
      id: /^\d+$/u.test(current.id) ? Number(current.id) : current.id,
      resource_name: 'MemberResource',
      inner_content: innerContent,
    },
  );
}

export async function readMemberResource(id: string): Promise<MemberResourceRecord> {
  const payload = await apiClient.get<unknown>(endpoints.resources.member.read(id));
  const rows = unwrapRows(payload);
  if (rows.length !== 1) throw new Error(`Expected one MemberResource for ID ${id}.`);
  return parseMemberResource(rows[0]);
}
