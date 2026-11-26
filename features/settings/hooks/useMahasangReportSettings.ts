'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchMahasangReportSettings,
  saveMahasangReportSettings,
  type MahasangReportSettings,
} from '@/features/settings/api/mahasang-report-settings.api';
import { settingsKeys } from '@/lib/query/query-keys';

export function useMahasangReportSettings() {
  const queryClient = useQueryClient();
  const queryKey = settingsKeys.mahasangReport();

  const query = useQuery({
    queryKey,
    queryFn: fetchMahasangReportSettings,
  });

  const mutation = useMutation({
    mutationFn: async (settings: MahasangReportSettings) => {
      if (!query.data) throw new Error('महासंघ रिपोर्ट सेटिङ लोड भएको छैन।');
      return saveMahasangReportSettings(settings, query.data);
    },
    onSuccess: (document) => {
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
    save: (settings: MahasangReportSettings) => mutation.mutateAsync(settings),
  };
}
