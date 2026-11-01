import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';

export function normalizeVehicleNumber(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function dedupeVehicleBlacklistRecords(records: VehicleBlacklistRecord[]): VehicleBlacklistRecord[] {
  const parents = records.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  };
  const identityOwners = new Map<string, number>();

  records.forEach((record, index) => {
    const identities = [
      record.vehicleId.trim() ? `id:${record.vehicleId.trim().toLocaleLowerCase()}` : '',
      normalizeVehicleNumber(record.vehicleNumber)
        ? `number:${normalizeVehicleNumber(record.vehicleNumber)}`
        : '',
    ].filter(Boolean);

    identities.forEach((identity) => {
      const existingIndex = identityOwners.get(identity);
      if (existingIndex === undefined) identityOwners.set(identity, index);
      else union(index, existingIndex);
    });
  });

  const latestRecords = new Map<number, VehicleBlacklistRecord>();
  records.forEach((record, index) => {
    const root = find(index);
    const existing = latestRecords.get(root);
    if (!existing || (record.blacklistedAt ?? '') > (existing.blacklistedAt ?? '')) {
      latestRecords.set(root, record);
    }
  });

  return [...latestRecords.values()];
}
