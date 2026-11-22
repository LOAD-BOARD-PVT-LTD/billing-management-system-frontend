'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStatistics } from '@/features/dashboard/services/dashboard-statistics.service';
import { dashboardKeys } from '@/lib/query/query-keys';

export function useDashboardStatistics(fiscalYear?: string) {
  const query = useQuery({
    queryKey: dashboardKeys.statistics(fiscalYear),
    queryFn: ({ signal }) => fetchDashboardStatistics(fiscalYear, signal),
    staleTime: 5 * 60 * 1000,
  });

  return {
    statistics: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    reload: () => query.refetch(),
  };
}
