import { apiClient } from '@/lib/api/client';
import { parseTqmsVehicleSearchResponse } from '../schemas/tqms-vehicle-search.schema';
import type { BillingVehicle } from '../model/types';

export async function searchTqmsVehicles(vehicleNumber: string, signal?: AbortSignal): Promise<BillingVehicle[]> {
  const query = vehicleNumber.trim();
  if (!query) return [];

  const payload = await apiClient.post<unknown>(
    'tqms/search',
    { vehicle_number: query },
    { signal },
  );
  return parseTqmsVehicleSearchResponse(payload, query);
}
