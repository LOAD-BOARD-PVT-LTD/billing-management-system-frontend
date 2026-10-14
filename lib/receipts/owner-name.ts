import { isUnidentifiedTqmsOwnerName } from '@/lib/tqms-owner-placeholders';

function normalizeComparableText(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/gu, ' ').toUpperCase();
}

export function isVehicleNumberPlaceholderName(name: string | null | undefined, vehicleNumber: string | null | undefined): boolean {
  const normalizedName = normalizeComparableText(name);
  const normalizedVehicleNumber = normalizeComparableText(vehicleNumber);
  if (!normalizedName || !normalizedVehicleNumber) return false;
  return normalizedName === normalizedVehicleNumber;
}

export function getRealOwnerName(name: string | null | undefined, vehicleNumber: string | null | undefined): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (isUnidentifiedTqmsOwnerName(trimmed)) return null;
  if (isVehicleNumberPlaceholderName(trimmed, vehicleNumber)) return null;
  return trimmed;
}

export function resolvePreferredOwnerNameForDisplay(params: {
  subjectName: string | null | undefined;
  vehicleOwnerName: string | null | undefined;
  vehicleNumber: string | null | undefined;
}): string {
  const preferredSubjectName = getRealOwnerName(params.subjectName, params.vehicleNumber);
  if (preferredSubjectName) return preferredSubjectName;

  const preferredVehicleOwnerName = getRealOwnerName(params.vehicleOwnerName, params.vehicleNumber);
  if (preferredVehicleOwnerName) return preferredVehicleOwnerName;

  const fallbackVehicleOwnerName = typeof params.vehicleOwnerName === 'string' ? params.vehicleOwnerName.trim() : '';
  return fallbackVehicleOwnerName || '-';
}
