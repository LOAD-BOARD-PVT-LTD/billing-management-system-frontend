'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVehicleBlacklist,
  fetchVehicleBlacklist,
  updateVehicleBlacklist,
} from '@/features/vehicle/blacklist/api/vehicle-blacklist.api';
import { vehicleBlacklistKeys } from '@/lib/query/query-keys';

export function useVehicleBlacklist() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: vehicleBlacklistKeys.list(),
    queryFn: fetchVehicleBlacklist,
    staleTime: 30_000,
  });
  const createMutation = useMutation({
    mutationFn: createVehicleBlacklist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleBlacklistKeys.all }),
  });
  const updateMutation = useMutation({
    mutationFn: updateVehicleBlacklist,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleBlacklistKeys.all }),
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: query.refetch,
    createRecord: createMutation.mutateAsync,
    updateRecord: updateMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}
