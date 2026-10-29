'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTqmsMemberRegistry } from '@/features/vehicle/tqms/api/tqms-member-registry.api';
import { tqmsMemberRegistryKeys } from '@/lib/query/query-keys';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';

export function useTqmsMemberRegistry() {
  const branchFilter = useTqmsSanghBranchFilter();
  const query = useQuery({
    queryKey: tqmsMemberRegistryKeys.lists(branchFilter.branchName),
    queryFn: ({ signal }) => fetchTqmsMemberRegistry(signal, branchFilter.branchName),
    enabled: !branchFilter.isLoading && !branchFilter.error,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    vehicles: query.data ?? [],
    isLoading: branchFilter.isLoading || query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: branchFilter.error ?? (query.error instanceof Error ? query.error.message : null),
    reload: query.refetch,
    branchFilter: branchFilter.branchName,
  };
}