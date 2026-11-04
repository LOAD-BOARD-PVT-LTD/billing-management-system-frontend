'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchVatSettings, saveVatSettings, type VatSettings } from '@/features/settings/api/vat-settings.api';
import { settingsKeys } from '@/lib/query/query-keys';

const queryKey = [...settingsKeys.all, 'organization-vat'] as const;

export function useVatSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: fetchVatSettings,
  });
  const mutation = useMutation({
    mutationFn: async (settings: VatSettings) => {
      if (!query.data) throw new Error('VAT सेटिङ लोड भएको छैन।');
      return saveVatSettings(settings, query.data);
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
    save: (settings: VatSettings) => mutation.mutateAsync(settings),
  };
}
