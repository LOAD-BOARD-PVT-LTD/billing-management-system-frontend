'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBranch, fetchBranches, updateBranch } from '../api/branches.api';
import type { BranchFields } from '../types/branch.types';

const BRANCHES_QUERY_KEY = ['branches'] as const;
const EMPTY_BRANCHES: Awaited<ReturnType<typeof fetchBranches>> = [];

export function useBranches() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: BRANCHES_QUERY_KEY, queryFn: fetchBranches });
  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: BranchFields }) => updateBranch(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY }),
  });

  return {
    records: query.data ?? EMPTY_BRANCHES,
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
    create: createMutation.mutateAsync,
    update: (id: string, fields: BranchFields) => updateMutation.mutateAsync({ id, fields }),
    reload: () => query.refetch(),
  };
}
