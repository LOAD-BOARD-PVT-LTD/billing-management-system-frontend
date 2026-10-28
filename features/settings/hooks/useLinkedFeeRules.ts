'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	fetchLinkedFeeRules,
	saveLinkedFeeRules,
	type LinkedFeeRulesSettings,
} from '@/features/settings/api/linked-fee-rules.api';
import { settingsKeys } from '@/lib/query/query-keys';

export function useLinkedFeeRules() {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: settingsKeys.linkedFeeRules(),
		queryFn: fetchLinkedFeeRules,
	});
	const saveMutation = useMutation({
		mutationFn: async (settings: LinkedFeeRulesSettings) => {
			if (!query.data) throw new Error('जोडिएको शुल्क नियम सेटिङ लोड भएको छैन।');
			return saveLinkedFeeRules(settings, query.data);
		},
		onSuccess: (document) => {
			queryClient.setQueryData(settingsKeys.linkedFeeRules(), document);
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
		save: (settings: LinkedFeeRulesSettings) => saveMutation.mutateAsync(settings),
	};
}
