'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchFiscalYearSelectorSettings,
	saveFiscalYearSelectorSettings,
	type FiscalYearSelectorSettings,
} from '@/features/settings/api/fiscal-year-selector.api';
import { settingsKeys } from '@/lib/query/query-keys';

export function useFiscalYearSelectorSettings() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.fiscalYearSelector(),
		queryFn: fetchFiscalYearSelectorSettings,
	});
	const saveMutation = useMutation({
		mutationFn: async (settings: FiscalYearSelectorSettings) => {
			if (!query.data) throw new Error('आर्थिक वर्ष चयनकर्ता सेटिङ लोड भएको छैन।');
			return saveFiscalYearSelectorSettings(settings, query.data);
		},
		onSuccess: (document) => {
			queryClient.setQueryData(settingsKeys.fiscalYearSelector(), document);
		},
	});

	return {
		document: query.data,
		settings: query.data?.settings ?? null,
		isLoading: query.isLoading,
		isSaving: saveMutation.isPending,
		error: query.error instanceof Error
			? query.error.message
			: saveMutation.error instanceof Error ? saveMutation.error.message : null,
		reload: () => query.refetch(),
		save: (settings: FiscalYearSelectorSettings) => saveMutation.mutateAsync(settings),
	};
}
