'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBillingEntity, fetchBillingEntities, updateBillingEntity } from '../api/billing-entities.api';
import type { BillingEntityFields } from '../types/billing-entity.types';

const BILLING_ENTITIES_QUERY_KEY = ['billing-entities'] as const;
const EMPTY_BILLING_ENTITIES: Awaited<ReturnType<typeof fetchBillingEntities>> = [];

export function useBillingEntities() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: BILLING_ENTITIES_QUERY_KEY,
    queryFn: fetchBillingEntities,
  });

  const createMutation = useMutation({
    mutationFn: createBillingEntity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BILLING_ENTITIES_QUERY_KEY }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: BillingEntityFields }) => updateBillingEntity(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BILLING_ENTITIES_QUERY_KEY }),
  });

  const reload = () => queryClient.invalidateQueries({ queryKey: BILLING_ENTITIES_QUERY_KEY });

  return {
    records: query.data ?? EMPTY_BILLING_ENTITIES,
    isLoading: query.isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    error: query.error instanceof Error
      ? query.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : updateMutation.error instanceof Error
          ? updateMutation.error.message
          : null,
    create: createMutation.mutateAsync,
    update: (id: string, fields: BillingEntityFields) => updateMutation.mutateAsync({ id, fields }),
    reload,
  };
}
