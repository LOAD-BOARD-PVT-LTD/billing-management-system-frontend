import { normalizeVehiclePlate } from '@/lib/server/vehicle-identity/normalize-plate';

export function confirmedVehicleNumberMatches(
  confirmedVehicleNumber: string | null | undefined,
  candidateVehicleNumber: string | null | undefined,
): boolean {
  if (!confirmedVehicleNumber || !candidateVehicleNumber) return false;
  return normalizeVehiclePlate(confirmedVehicleNumber) === normalizeVehiclePlate(candidateVehicleNumber);
}
