'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import { vehicleResourceKeys } from '@/lib/query/query-keys';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';

export function useMemberVehicles() {
  const branchFilter = useTqmsSanghBranchFilter();
  const query = useQuery({
    queryKey: vehicleResourceKeys.memberVehicleList(branchFilter.branchName),
    queryFn: async ({ signal }) => {
      const vehicles = await fetchMemberVehicleDetails(signal);
      return vehicles.filter((vehicle) => matchesTqmsSanghBranch(vehicle.branch, branchFilter.branchName));
    },
    enabled: !branchFilter.isLoading && !branchFilter.error,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });

  return {
    vehicles: query.data ?? [],
    isLoading: branchFilter.isLoading || query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    lastSyncedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    error: branchFilter.error ?? (query.error instanceof Error ? query.error.message : null),
    reload: () => query.refetch(),
    branchFilter: branchFilter.branchName,
  };
}
