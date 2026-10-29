'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchTqmsVehicles } from '../api/tqms-vehicle-search.api';
import { billingKeys } from '@/lib/query/query-keys';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

export function useTqmsVehicleSearch(query: string, enabled = true) {
	const branchFilter = useTqmsSanghBranchFilter();
	const normalizedQuery = query.trim();
	const [debouncedQuery, setDebouncedQuery] = useState('');

	useEffect(() => {
		const timeoutId = window.setTimeout(() => setDebouncedQuery(normalizedQuery), DEBOUNCE_MS);
		return () => window.clearTimeout(timeoutId);
	}, [normalizedQuery]);

	const canSearch = enabled && normalizedQuery.length >= MIN_QUERY_LENGTH;
	const isDebouncing = canSearch && normalizedQuery !== debouncedQuery;
	const canApplyBranchFilter = !branchFilter.isLoading && !branchFilter.error;
	const searchQuery = useQuery({
		queryKey: billingKeys.tqmsVehicleSearch(debouncedQuery, branchFilter.branchName),
		queryFn: ({ signal }) => searchTqmsVehicles(debouncedQuery, signal, branchFilter.branchName),
		enabled: debouncedQuery.length >= MIN_QUERY_LENGTH && canSearch && !isDebouncing && canApplyBranchFilter,
	});

	return {
		vehicles: canSearch && !isDebouncing && canApplyBranchFilter ? searchQuery.data ?? [] : [],
		isLoading: (canSearch && branchFilter.isLoading) || isDebouncing || searchQuery.isFetching,
		error: branchFilter.error ?? (searchQuery.error instanceof Error ? searchQuery.error.message : null),
	};
}
