'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMemberVehicleBlacklist,
  createVehicleBlacklist,
  fetchVehicleBlacklist,
  updateVehicleBlacklist,
} from '@/features/vehicle/blacklist/api/vehicle-blacklist.api';
import { vehicleBlacklistKeys } from '@/lib/query/query-keys';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';

export function useVehicleBlacklist() {
  const queryClient = useQueryClient();
  const branchFilter = useTqmsSanghBranchFilter();
  const query = useQuery({
    queryKey: vehicleBlacklistKeys.list(branchFilter.branchName),
    queryFn: ({ signal }) => fetchVehicleBlacklist(signal, branchFilter.branchName),
    enabled: !branchFilter.isLoading && !branchFilter.error,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const createMutation = useMutation({
    mutationFn: createVehicleBlacklist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleBlacklistKeys.list(branchFilter.branchName) }),
  });
  const createMemberMutation = useMutation({
    mutationFn: createMemberVehicleBlacklist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleBlacklistKeys.list(branchFilter.branchName) }),
  });
  const updateMutation = useMutation({
    mutationFn: updateVehicleBlacklist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleBlacklistKeys.list(branchFilter.branchName) }),
  });

  return {
    records: query.data ?? [],
    isLoading: branchFilter.isLoading || query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: branchFilter.error ?? (query.error instanceof Error ? query.error.message : null),
    reload: query.refetch,
    createRecord: createMutation.mutateAsync,
    createMemberRecord: createMemberMutation.mutateAsync,
    updateRecord: updateMutation.mutateAsync,
    isSaving: createMutation.isPending || createMemberMutation.isPending || updateMutation.isPending,
  };
}
