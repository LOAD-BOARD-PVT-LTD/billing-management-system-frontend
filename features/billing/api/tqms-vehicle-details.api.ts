import { apiClient } from '@/lib/api/client';
import { parseTqmsVehicleDetailsResponse } from '../schemas/tqms-vehicle-details.schema';
import type { TqmsVehicleDetails } from '../schemas/tqms-vehicle-details.schema';

export async function getTqmsVehicleDetails(
	vehicleNumber: string,
	signal?: AbortSignal,
): Promise<TqmsVehicleDetails> {
	const normalizedVehicleNumber = vehicleNumber.trim();
	if (!normalizedVehicleNumber) {
		throw new Error('Vehicle number is required to load TQMS vehicle details.');
	}

	const payload = await apiClient.get<unknown>(
		`tqms/vehicle_details/${encodeURIComponent(normalizedVehicleNumber)}`,
		{ signal },
	);
	return parseTqmsVehicleDetailsResponse(payload);
}
