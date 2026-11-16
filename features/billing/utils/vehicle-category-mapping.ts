import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

function normalize(value: string): string {
	return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export function findMappedVehicleCategory(
	categories: VehicleTypeRecord[],
	vehicleTypeId: string,
): VehicleTypeRecord | null {
	const normalizedTypeId = normalize(vehicleTypeId);
	if (!normalizedTypeId) return null;
	return categories.find((category) => (
		category.vehicleTypes.some((mappedType) => normalize(mappedType) === normalizedTypeId)
	)) ?? null;
}
