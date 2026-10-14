import { createHash } from 'node:crypto';

import { normalizeVehiclePlate } from '@/lib/server/vehicle-identity/normalize-plate';

export type VehicleOwnerResolutionAction =
  | 'KEEP_EXISTING_MEMBER'
  | 'UPDATE_EXISTING_MEMBER_FROM_TQMS'
  | 'CREATE_NEW_MEMBER_FOR_OWNER';

export type OwnerSummary = {
  name: string | null;
  phone: string | null;
  address: string | null;
};

export type OwnerFieldDifference = {
  field: keyof OwnerSummary;
  local: string | null;
  tqms: string | null;
};

export type OwnerResolutionInput = {
  oldPlate: string;
  currentPlate: string;
  action?: VehicleOwnerResolutionAction | null;
  reason?: string | null;
};

export const OWNER_RESOLUTION_TTL_MS = 60 * 60 * 1000;

export function isOwnerResolutionDecisionCurrent(expiresAt: Date, now: Date): boolean {
  return !Number.isNaN(expiresAt.getTime())
    && !Number.isNaN(now.getTime())
    && now.getTime() < expiresAt.getTime();
}

export function assertOwnerSourceFingerprint(value: string): string {
  const fingerprint = value.trim();
  if (!/^[0-9a-f]{64}$/u.test(fingerprint)) {
    throw new Error('INVALID_VEHICLE_OWNER_SOURCE_FINGERPRINT');
  }
  return fingerprint;
}

const OWNER_ACTIONS = new Set<VehicleOwnerResolutionAction>([
  'KEEP_EXISTING_MEMBER',
  'UPDATE_EXISTING_MEMBER_FROM_TQMS',
  'CREATE_NEW_MEMBER_FOR_OWNER',
]);

const NEPALI_ZERO = '०'.codePointAt(0)!;

function normalizeText(value: string | null): string {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toUpperCase();
}

function normalizePhone(value: string | null): string {
  return Array.from((value ?? '').normalize('NFKC'))
    .map((character) => {
      const codePoint = character.codePointAt(0)!;
      return codePoint >= NEPALI_ZERO && codePoint <= NEPALI_ZERO + 9
        ? String(codePoint - NEPALI_ZERO)
        : character;
    })
    .join('')
    .replace(/[^0-9]+/gu, '');
}

export function normalizeOwnerFieldValue(
  field: keyof OwnerSummary,
  value: string | null,
): string {
  return field === 'phone' ? normalizePhone(value) : normalizeText(value);
}

export function platesRepresentSameRegistration(oldPlate: string, currentPlate: string): boolean {
  const oldNormalized = normalizeVehiclePlate(oldPlate);
  const currentNormalized = normalizeVehiclePlate(currentPlate);
  return Boolean(oldNormalized && currentNormalized && oldNormalized === currentNormalized);
}

export function ownerFieldsDiffer(
  local: OwnerSummary,
  tqms: OwnerSummary,
): OwnerFieldDifference[] {
  const differences: OwnerFieldDifference[] = [];
  for (const field of ['name', 'phone', 'address'] as const) {
    const localValue = normalizeOwnerFieldValue(field, local[field]);
    const tqmsValue = normalizeOwnerFieldValue(field, tqms[field]);
    if (localValue !== tqmsValue) differences.push({ field, local: local[field], tqms: tqms[field] });
  }
  return differences;
}

export function fingerprintTqmsOwnerSource(input: {
  tqmsVehicleId: string;
  owner: OwnerSummary;
}): string {
  const tqmsVehicleId = input.tqmsVehicleId.trim();
  if (!tqmsVehicleId) throw new Error('TQMS_VEHICLE_ID_REQUIRED');
  const canonical = JSON.stringify({
    version: 'TQMS_OWNER_V1',
    tqmsVehicleId,
    name: normalizeText(input.owner.name),
    phone: normalizePhone(input.owner.phone),
    address: normalizeText(input.owner.address),
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function assertOwnerResolutionInput(input: OwnerResolutionInput): OwnerResolutionInput {
  if (!input.action) throw new Error('VEHICLE_OWNER_RESOLUTION_ACTION_REQUIRED');
  if (!OWNER_ACTIONS.has(input.action)) throw new Error('INVALID_VEHICLE_OWNER_RESOLUTION_ACTION');
  if (!normalizeVehiclePlate(input.oldPlate) || !normalizeVehiclePlate(input.currentPlate)) {
    throw new Error('INVALID_VEHICLE_NUMBER');
  }
  const reason = input.reason?.trim() ?? '';
  if (!platesRepresentSameRegistration(input.oldPlate, input.currentPlate) && !reason) {
    throw new Error('NUMBER_CHANGE_REASON_REQUIRED');
  }
  if (reason.length > 500) throw new Error('NUMBER_CHANGE_REASON_TOO_LONG');
  return { ...input, reason };
}
