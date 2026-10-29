'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchTqmsSanghBranchFilter,
	saveTqmsSanghBranchFilter,
} from '@/features/settings/api/tqms-sangh-branch-filter.api';
import { billingKeys, settingsKeys, vehicleResourceKeys } from '@/lib/query/query-keys';

export function useTqmsSanghBranchFilter() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.tqmsSanghBranchFilter(),
		queryFn: fetchTqmsSanghBranchFilter,
		staleTime: 5 * 60 * 1000,
	});
	const saveMutation = useMutation({
		mutationFn: async (branchName: string) => {
			if (!query.data) throw new Error('TQMS संघ शाखा फिल्टर सेटिङ लोड भएको छैन।');
			return saveTqmsSanghBranchFilter(branchName, query.data);
		},
		onSuccess: async (document) => {
			queryClient.setQueryData(settingsKeys.tqmsSanghBranchFilter(), document);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: billingKeys.all }),
				queryClient.invalidateQueries({ queryKey: vehicleResourceKeys.all }),
			]);
		},
	});

	return {
		document: query.data,
		branchName: query.data?.branchName ?? '',
		isLoading: query.isLoading,
		loadError: query.error instanceof Error ? query.error.message : null,
		isSaving: saveMutation.isPending,
		error: query.error instanceof Error
			? query.error.message
			: saveMutation.error instanceof Error ? saveMutation.error.message : null,
		reload: () => query.refetch(),
		save: saveMutation.mutateAsync,
	};
}
