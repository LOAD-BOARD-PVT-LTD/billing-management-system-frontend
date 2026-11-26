'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchTqmsVehicleMatches } from '../../vehicle/tqms/api/tqms-vehicle-search.api';
import { billingKeys } from '@/lib/query/query-keys';
import { useTqmsSanghBranchFilter } from '@/features/settings/hooks/useTqmsSanghBranchFilter';

const DEBOUNCE_MS = 100;
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
		queryFn: ({ signal }) => searchTqmsVehicleMatches(debouncedQuery, signal, branchFilter.branchName),
		staleTime: 0,
		enabled: debouncedQuery.length >= MIN_QUERY_LENGTH && canSearch && !isDebouncing && canApplyBranchFilter,
	});
	const matches = canSearch && !isDebouncing && canApplyBranchFilter
		? searchQuery.data ?? []
		: [];

	return {
		matches,
		vehicles: matches.map((match) => match.tqmsVehicle),
		isLoading: (canSearch && branchFilter.isLoading) || isDebouncing || searchQuery.isFetching,
		error: branchFilter.error ?? (searchQuery.error instanceof Error ? searchQuery.error.message : null),
	};
}
