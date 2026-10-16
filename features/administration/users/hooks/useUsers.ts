'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, fetchUsers, updateUser } from '../services/users.service';
import type { UserFields, UserUpdateFields } from '../types/user.types';

const USERS_QUERY_KEY = ['users'] as const;
const EMPTY_USERS: Awaited<ReturnType<typeof fetchUsers>> = [];

export function useUsers() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: UserUpdateFields }) => updateUser(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  });

  return {
    records: query.data ?? EMPTY_USERS,
    isLoading: query.isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    error: query.error instanceof Error
      ? query.error.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : updateMutation.error instanceof Error
          ? updateMutation.error.message
          : null,
    create: (fields: UserFields) => createMutation.mutateAsync(fields),
    update: (id: string, fields: UserUpdateFields) => updateMutation.mutateAsync({ id, fields }),
    reload: () => query.refetch(),
  };
}
