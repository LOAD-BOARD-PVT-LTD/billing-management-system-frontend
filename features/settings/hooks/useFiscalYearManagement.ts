'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	deleteFiscalYear,
	fetchFiscalYearManagement,
	saveFiscalYearManagement,
} from '@/features/settings/api/fiscal-year-management.api';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import { billingRulesKeys, settingsKeys } from '@/lib/query/query-keys';

export function useFiscalYearManagement() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.fiscalYearManagement(),
		queryFn: async () => {
			const document = await fetchFiscalYearManagement();
			if (document.resourceId || document.fiscalYears.length === 0) return document;
			return saveFiscalYearManagement(document.fiscalYears, document);
		},
	});
	const mutation = useMutation({
		mutationFn: async (change: { type: 'save'; fiscalYears: FiscalYear[] } | { type: 'delete'; id: string }) => {
			if (!query.data) throw new Error('आर्थिक वर्ष सेटिङ लोड भएको छैन।');
			return change.type === 'save'
				? saveFiscalYearManagement(change.fiscalYears, query.data)
				: deleteFiscalYear(change.id, query.data);
		},
		onSuccess: (document) => {
			queryClient.setQueryData(settingsKeys.fiscalYearManagement(), document);
			void queryClient.invalidateQueries({ queryKey: billingRulesKeys.config() });
		},
	});

	return {
		document: query.data,
		fiscalYears: query.data?.fiscalYears ?? [],
		isLoading: query.isLoading,
		isSaving: mutation.isPending,
		error: query.error instanceof Error
			? query.error.message
			: mutation.error instanceof Error ? mutation.error.message : null,
		reload: () => query.refetch(),
		save: (fiscalYears: FiscalYear[]) => mutation.mutateAsync({ type: 'save', fiscalYears }),
		remove: (id: string) => mutation.mutateAsync({ type: 'delete', id }),
	};
}
