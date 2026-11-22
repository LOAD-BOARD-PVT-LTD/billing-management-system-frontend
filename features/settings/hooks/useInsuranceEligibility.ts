'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchInsuranceEligibilitySettings,
  INSURANCE_ELIGIBILITY_SETTING_KEY,
  saveInsuranceEligibilitySettings,
  type InsuranceEligibilitySettings,
} from '@/features/settings/api/insurance-eligibility.api';
import { settingsKeys } from '@/lib/query/query-keys';

const queryKey = [...settingsKeys.all, INSURANCE_ELIGIBILITY_SETTING_KEY] as const;

export function useInsuranceEligibility() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: fetchInsuranceEligibilitySettings,
  });
  const mutation = useMutation({
    mutationFn: async (settings: InsuranceEligibilitySettings) => {
      if (!query.data) throw new Error('Insurance eligibility सेटिङ लोड भएको छैन।');
      return saveInsuranceEligibilitySettings(settings, query.data);
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
    save: (settings: InsuranceEligibilitySettings) => mutation.mutateAsync(settings),
  };
}
