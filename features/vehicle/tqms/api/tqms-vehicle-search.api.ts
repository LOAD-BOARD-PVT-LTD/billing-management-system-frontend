import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import {
	parseTqmsVehicleSearchMatches,
	type TqmsVehicleSearchMatch,
} from '../../../billing/schemas/tqms-vehicle-search.schema';
import type { BillingVehicle } from '../../../billing/model/types';

export async function searchTqmsVehicleMatches(
	vehicleNumber: string,
	signal?: AbortSignal,
	branchName = '',
): Promise<TqmsVehicleSearchMatch[]> {
  const query = vehicleNumber.trim();
  if (!query) return [];

  const payload = await apiClient.post<unknown>(
    endpoints.tqms.searchVehicles,
    { vehicle_number: query, status: 'ACTIVE' },
    { signal },
  );
  return parseTqmsVehicleSearchMatches(payload, query)
    .filter((match) => matchesTqmsSanghBranch(match.tqmsVehicle.branch, branchName));
}

export async function searchTqmsVehicles(
	vehicleNumber: string,
	signal?: AbortSignal,
	branchName = '',
): Promise<BillingVehicle[]> {
  const matches = await searchTqmsVehicleMatches(vehicleNumber, signal, branchName);
  return matches.map((match) => match.tqmsVehicle);
}
