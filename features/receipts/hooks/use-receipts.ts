'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchReceipts } from '@/features/receipts/api/bill-resource.api';
import { receiptsKeys } from '@/lib/query/query-keys';

export function useReceipts() {
  const query = useQuery({
    queryKey: receiptsKeys.lists(),
    queryFn: fetchReceipts,
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),
  };
}
