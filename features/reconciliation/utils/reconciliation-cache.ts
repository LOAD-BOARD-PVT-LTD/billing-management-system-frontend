import type { QueryClient } from '@tanstack/react-query';
import { billingKeys, vehicleResourceKeys } from '@/lib/query/query-keys';

export async function invalidateVehicleReconciliationCaches(queryClient: QueryClient): Promise<void> {
  queryClient.removeQueries({
    queryKey: [...billingKeys.all, 'tqms-vehicle-search'],
  });
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: billingKeys.all }),
    queryClient.invalidateQueries({ queryKey: vehicleResourceKeys.all }),
  ]);
}
