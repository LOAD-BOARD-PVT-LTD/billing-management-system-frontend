'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchDisplacedTaggingSetting,
  saveDisplacedTaggingSetting,
} from '@/features/settings/api/displaced-tagging.api';
import { settingsKeys } from '@/lib/query/query-keys';

export function useDisplacedTaggingSetting() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.displacedTagging(),
    queryFn: fetchDisplacedTaggingSetting,
    staleTime: 5 * 60 * 1000,
  });
  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!query.data) throw new Error('विस्थापित ट्याग सेटिङ लोड भएको छैन।');
      return saveDisplacedTaggingSetting(enabled, query.data);
    },
    onSuccess: (setting) => {
      queryClient.setQueryData(settingsKeys.displacedTagging(), setting);
    },
  });

  return {
    setting: query.data,
    enabled: query.data?.enabled ?? true,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error instanceof Error
      ? query.error.message
      : mutation.error instanceof Error ? mutation.error.message : null,
    reload: () => query.refetch(),
    save: mutation.mutateAsync,
  };
}
