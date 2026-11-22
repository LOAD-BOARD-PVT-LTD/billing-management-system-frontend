'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchFiscalYearManagement,
	updateBillingFiscalYearAccess,
	type BillingFiscalYearControlTarget,
	type FiscalYearManagementDocument,
} from '@/features/settings/api/fiscal-year-management.api';
import type { BillingFiscalYearAccessStatus } from '@/features/settings/api/grouped-settings.api';
import { billingRulesKeys, settingsKeys } from '@/lib/query/query-keys';

export function useFiscalYearManagement() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.fiscalYearManagement(),
		queryFn: () => fetchFiscalYearManagement(),
	});
	const mutation = useMutation({
		mutationFn: async ({
			target,
			status,
			performedBy,
		}: {
			target: BillingFiscalYearControlTarget;
			status: BillingFiscalYearAccessStatus;
			performedBy: string;
		}) => {
			if (!query.data) throw new Error('आर्थिक वर्ष सेटिङ लोड भएको छैन।');
			return updateBillingFiscalYearAccess(target, status, performedBy, query.data);
		},
		onSuccess: (document: FiscalYearManagementDocument) => {
			queryClient.setQueryData(settingsKeys.fiscalYearManagement(), document);
			void queryClient.invalidateQueries({ queryKey: billingRulesKeys.config() });
		},
	});

	return {
		document: query.data,
		fiscalYears: query.data?.fiscalYears ?? [],
		billingFiscalYears: query.data?.billingFiscalYears ?? [],
		currentFiscalYear: query.data?.currentFiscalYear ?? '',
		previousYearControl: query.data?.previousYearControl ?? null,
		nextYearControl: query.data?.nextYearControl ?? null,
		isLoading: query.isLoading,
		isSaving: mutation.isPending,
		error: query.error instanceof Error
			? query.error.message
			: mutation.error instanceof Error ? mutation.error.message : null,
		reload: () => query.refetch(),
		setBillingYearStatus: (
			target: BillingFiscalYearControlTarget,
			status: BillingFiscalYearAccessStatus,
			performedBy: string,
		) => mutation.mutateAsync({ target, status, performedBy }),
	};
}
