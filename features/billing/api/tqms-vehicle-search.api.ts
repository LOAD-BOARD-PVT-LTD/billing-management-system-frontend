import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import { parseTqmsVehicleSearchResponse } from '../schemas/tqms-vehicle-search.schema';
import type { BillingVehicle } from '../model/types';

export async function searchTqmsVehicles(
	vehicleNumber: string,
	signal?: AbortSignal,
	branchName = '',
): Promise<BillingVehicle[]> {
  const query = vehicleNumber.trim();
  if (!query) return [];

  const payload = await apiClient.post<unknown>(
    endpoints.tqms.searchVehicles,
    { vehicle_number: query },
    { signal },
  );
  return parseTqmsVehicleSearchResponse(payload, query)
    .filter((vehicle) => matchesTqmsSanghBranch(vehicle.branch, branchName));
}
