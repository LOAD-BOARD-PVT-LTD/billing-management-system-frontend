'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchArrearsRuleSettings,
  saveArrearsRuleSettings,
  type ArrearsRuleSettings,
  type ArrearsRuleSettingsDocument,
} from '@/features/vehicle/compliance/api/arrears-settings.api';
import { settingsKeys } from '@/lib/query/query-keys';

const queryKey = [...settingsKeys.all, 'arrears-list-rules'] as const;

export function useArrearsRuleSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: fetchArrearsRuleSettings,
  });
  const mutation = useMutation({
    mutationFn: async (settings: ArrearsRuleSettings) => {
      if (!query.data) throw new Error('बक्यौता नियम सेटिङ लोड भएको छैन।');
      return saveArrearsRuleSettings(settings, query.data);
    },
    onSuccess: (document: ArrearsRuleSettingsDocument) => {
      queryClient.setQueryData(queryKey, document);
    },
  });

  return {
    document: query.data,
    settings: query.data?.settings,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error instanceof Error
      ? query.error.message
      : mutation.error instanceof Error ? mutation.error.message : null,
    reload: () => query.refetch(),
    save: (settings: ArrearsRuleSettings) => mutation.mutateAsync(settings),
  };
}
