'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchTqmsMemberRegistry } from '@/features/vehicle/tqms/api/tqms-member-registry.api';
import { tqmsMemberRegistryKeys } from '@/lib/query/query-keys';

export function useTqmsMemberRegistry() {
  const query = useQuery({
    queryKey: tqmsMemberRegistryKeys.lists(),
    queryFn: ({ signal }) => fetchTqmsMemberRegistry(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    vehicles: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
  };
}