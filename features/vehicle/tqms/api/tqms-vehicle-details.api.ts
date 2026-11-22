import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseTqmsVehicleDetailsResponse } from '../../../billing/schemas/tqms-vehicle-details.schema';
import type { TqmsVehicleDetails } from '../../../billing/schemas/tqms-vehicle-details.schema';

export async function getTqmsVehicleDetails(
	vehicleNumber: string,
	signal?: AbortSignal,
): Promise<TqmsVehicleDetails> {
	const normalizedVehicleNumber = vehicleNumber.trim();
	if (!normalizedVehicleNumber) {
		throw new Error('Vehicle number is required to load TQMS vehicle details.');
	}

	const payload = await apiClient.get<unknown>(
		endpoints.tqms.vehicleDetails(normalizedVehicleNumber),
		{ signal },
	);
	return parseTqmsVehicleDetailsResponse(payload);
}
