'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMemberResources, removeMemberDisplaced, tagMemberDisplaced } from '@/features/members/api/member-resource.api';
import type { MemberResourceInput, MemberResourceRecord } from '@/features/members/model/member';
import { memberKeys } from '@/lib/query/member-keys';

export function useMembers() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: memberKeys.lists(),
    queryFn: ({ signal }) => fetchMemberResources(signal),
    staleTime: 60_000,
    gcTime: 30 * 60 * 1000,
  });
  const tagMutation = useMutation({
    mutationFn: ({ input, existing }: { input: MemberResourceInput; existing?: MemberResourceRecord }) => (
      tagMemberDisplaced(input, existing)
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.all }),
  });
  const removeMutation = useMutation({
    mutationFn: removeMemberDisplaced,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.all }),
  });

  return {
    memberResources: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),
    tagDisplaced: (input: MemberResourceInput, existing?: MemberResourceRecord) => (
      tagMutation.mutateAsync({ input, existing })
    ),
    removeDisplaced: removeMutation.mutateAsync,
    isSaving: tagMutation.isPending || removeMutation.isPending,
  };
}
