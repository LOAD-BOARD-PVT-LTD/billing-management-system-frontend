import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseTqmsVehicleSearchResponse } from '../schemas/tqms-vehicle-search.schema';
import type { BillingVehicle } from '../model/types';

export async function searchTqmsVehicles(vehicleNumber: string, signal?: AbortSignal): Promise<BillingVehicle[]> {
  const query = vehicleNumber.trim();
  if (!query) return [];

  const payload = await apiClient.post<unknown>(
    endpoints.tqms.searchVehicles,
    { vehicle_number: query },
    { signal },
  );
  return parseTqmsVehicleSearchResponse(payload, query);
}
