'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReceipts } from '@/features/receipts/api/bill-resource.api';
import { receiptsKeys } from '@/lib/query/query-keys';

export function useReceipts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: receiptsKeys.lists(),
    queryFn: ({ signal }) => fetchReceipts(signal),
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),
    ensureRecords: () => queryClient.fetchQuery({
      queryKey: receiptsKeys.lists(),
      queryFn: ({ signal }) => fetchReceipts(signal),
      staleTime: 60 * 1000,
      gcTime: 30 * 60 * 1000,
    }),
  };
}
