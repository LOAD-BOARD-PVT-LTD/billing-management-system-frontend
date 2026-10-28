'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import { vehicleResourceKeys } from '@/lib/query/query-keys';

export function useMemberVehicles() {
  const query = useQuery({
    queryKey: vehicleResourceKeys.list(),
    queryFn: ({ signal }) => fetchMemberVehicleDetails(signal),
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return {
    vehicles: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    lastSyncedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),
  };
}
