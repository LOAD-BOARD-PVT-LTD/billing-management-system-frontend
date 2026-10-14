'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchReceiptCancelWindow,
	saveReceiptCancelWindow,
	type ReceiptCancelWindow,
} from '@/features/settings/api/receipt-cancel-window.api';
import { settingsKeys } from '@/lib/query/query-keys';

export function useReceiptCancelWindow() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.receiptCancelWindow(),
		queryFn: fetchReceiptCancelWindow,
	});
	const saveMutation = useMutation({
		mutationFn: async (policy: ReceiptCancelWindow) => {
			if (!query.data) throw new Error('रसिद रद्द समय सीमा सेटिङ लोड भएको छैन।');
			return saveReceiptCancelWindow(policy, query.data);
		},
		onSuccess: (document) => {
			queryClient.setQueryData(settingsKeys.receiptCancelWindow(), document);
		},
	});

	return {
		document: query.data,
		policy: query.data?.policy ?? null,
		isLoading: query.isLoading,
		isSaving: saveMutation.isPending,
		error: query.error instanceof Error
			? query.error.message
			: saveMutation.error instanceof Error ? saveMutation.error.message : null,
		reload: () => query.refetch(),
		save: (policy: ReceiptCancelWindow) => saveMutation.mutate(policy),
	};
}
