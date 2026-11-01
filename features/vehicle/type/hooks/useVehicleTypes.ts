'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  createVehicleType,
  fetchVehicleTypes,
  updateVehicleType,
} from '@/features/vehicle/type/api/vehicle-type.api';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { vehicleTypeKeys } from '@/lib/query/query-keys';

const EMPTY_VEHICLE_TYPES: VehicleTypeRecord[] = [];

export function useVehicleTypes() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: vehicleTypeKeys.lists(),
    queryFn: fetchVehicleTypes,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createVehicleType,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleTypeKeys.lists() }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { categoryName: string; vehicleTypes: string[] } }) =>
      updateVehicleType(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleTypeKeys.lists() }),
  });

  const reload = () => query.refetch();

  const records = query.data ?? EMPTY_VEHICLE_TYPES;

  const summary = useMemo(() => {
    return {
      total: records.length,
      mappedVehicleTypes: records.reduce((total, record) => total + record.vehicleTypes.length, 0),
    };
  }, [records]);

  return {
    records,
    isLoading: query.isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    loadError: query.error instanceof Error ? query.error.message : null,
    error: query.error instanceof Error
      ? query.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : updateMutation.error instanceof Error
          ? updateMutation.error.message
          : null,
    summary,
    create: createMutation.mutateAsync,
    update: (id: string, payload: { categoryName: string; vehicleTypes: string[] }) =>
      updateMutation.mutateAsync({ id, payload }),
    reload,
  };
}
