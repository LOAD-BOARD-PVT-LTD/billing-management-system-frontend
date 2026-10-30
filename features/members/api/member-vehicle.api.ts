import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

type JsonRecord = Record<string, unknown>;

export type VehicleDocumentPeriod = {
  startBs: string;
  startAd: string;
  expiryBs: string;
  expiryAd: string;
};

export type VehicleCompliance = {
  insurance: VehicleDocumentPeriod;
  checkPass: VehicleDocumentPeriod;
  routePermit: VehicleDocumentPeriod;
  bluebook: VehicleDocumentPeriod;
};

export type MemberVehicleDetails = {
  vehicleId: string;
  vehicleNumber: string;
  tqmsVehicleType: string;
  tqmsVehicleTypeId: string;
  ownerType: string;
  branch: string;
  sanchalakName: string;
  sawariDhaniName: string;
  ownerCount: number;
  phone: string;
  address: string;
  identityNumber: string;
  compliance: VehicleCompliance;
};

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as JsonRecord
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function period(value: unknown): VehicleDocumentPeriod {
  const record = asRecord(value);
  return {
    startBs: text(record?.StartBs ?? record?.startBs),
    startAd: text(record?.StartAd ?? record?.startAd),
    expiryBs: text(record?.ExpiryBs ?? record?.expiryBs),
    expiryAd: text(record?.ExpiryAd ?? record?.expiryAd),
  };
}

function rows(value: unknown): unknown[] {
  if (typeof value === 'string') {
    try {
      return rows(JSON.parse(value) as unknown);
    } catch {
      throw new Error('Could not read VehicleResource list: invalid JSON.');
    }
  }
  if (Array.isArray(value)) return value.flatMap(rows);
  const record = asRecord(value);
  if (!record) throw new Error('Could not read VehicleResource list.');
  if (record.resource_name === 'VehicleResource' || record.resourceName === 'VehicleResource') return [record];
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return rows(record[key]);
  }
  if (record.inner_content || record.innerContent) return [record];
  return [];
}

export function parseMemberVehicleResource(value: unknown): MemberVehicleDetails {
  const resource = asRecord(value);
  const content = asRecord(resource?.inner_content ?? resource?.innerContent);
  const owners = Array.isArray(content?.Owners)
    ? content.Owners.map(asRecord).filter((owner): owner is JsonRecord => owner !== null)
    : [];
  const first = owners[0];
  const second = owners.length > 1 ? owners[1] : null;
  const mainOwner = owners.find((owner) => text(owner?.Type).toLocaleLowerCase() === 'main owner')
    ?? second
    ?? first;
  const branchNames = Array.from(new Set(
    owners.map((owner) => text(owner?.SanghBranch)).filter(Boolean),
  ));
  const compliance = asRecord(
    content?.Compliance
    ?? content?.compliance
    ?? resource?.Compliance
    ?? resource?.compliance,
  );
  const bluebook = compliance?.Bluebook
    ?? compliance?.BlueBook
    ?? content?.Bluebook
    ?? content?.BlueBook
    ?? content?.bluebook
    ?? content?.blueBook
    ?? resource?.Bluebook
    ?? resource?.BlueBook;
  const rawVehicleType = content?.VehicleType ?? content?.vehicleType;
  const vehicleTypeRecord = asRecord(rawVehicleType);
  const vehicleId = text(content?.VehicleId ?? content?.vehicleId);
  if (!resource || !content || !vehicleId) {
    throw new Error('VehicleResource is missing its billing vehicle ID or inner content.');
  }
  return {
    vehicleId,
    vehicleNumber: text(content?.VehicleNumber ?? content?.vehicleNumber),
    tqmsVehicleType: text(vehicleTypeRecord?.Name ?? vehicleTypeRecord?.name ?? rawVehicleType),
    tqmsVehicleTypeId: text(
      content?.VehicleTypeId
      ?? content?.VehicleTypeID
      ?? content?.TQMSVehicleTypeId
      ?? vehicleTypeRecord?.VehicleTypeId
      ?? vehicleTypeRecord?.vehicleTypeId
      ?? vehicleTypeRecord?.id,
    ),
    ownerType: text(mainOwner?.Type),
    branch: branchNames.join(', '),
    sanchalakName: text(first?.Name),
    sawariDhaniName: text(mainOwner?.Name) || text(first?.Name),
    ownerCount: owners.length,
    phone: text(mainOwner?.Phone) || text(first?.Phone),
    address: text(mainOwner?.Address) || text(first?.Address),
    identityNumber: text(
      mainOwner?.CitizenshipNumber
      ?? mainOwner?.IdentityNumber
      ?? mainOwner?.IdentificationNumber,
    ),
    compliance: {
      insurance: period(compliance?.Insurance ?? compliance?.insurance),
      checkPass: period(compliance?.CheckPass ?? compliance?.checkPass),
      routePermit: period(compliance?.RoutePermit ?? compliance?.routePermit),
      bluebook: period(bluebook),
    },
  };
}

export async function fetchMemberVehicleDetails(signal?: AbortSignal): Promise<MemberVehicleDetails[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.vehicle.list(), { signal });
  } catch (error) {
    if (error instanceof Error && /^Request failed \(404\):\s*No resources found for resource name\s*:?\s*VehicleResource\b/iu.test(error.message)) {
      return [];
    }
    throw error;
  }
  return rows(payload).map(parseMemberVehicleResource);
}
