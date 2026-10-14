'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { updateIncomeReportBillingTitle } from '@/components/common/layout/navigation/income-report-route';
import type { IncomeReportDateBasis, IncomeReportFilters } from '@/features/reports/types/income-report';
import { INCOME_REPORT_FILTER_KEYS, isValidDateFilter } from '@/features/reports/utils/income-report-filters';

function readFilters(searchParams: URLSearchParams): IncomeReportFilters {
  const dateBasis = searchParams.get('dateBasis');
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  return {
    fiscalYear: searchParams.get('fiscalYear') || 'all',
    branch: searchParams.get('branch') || 'all',
    user: searchParams.get('user') || 'all',
    billType: 'all',
    feeHead: searchParams.get('billingTitle') || searchParams.get('feeHead') || 'all',
    dateFrom: isValidDateFilter(dateFrom) ? dateFrom : '',
    dateTo: isValidDateFilter(dateTo) ? dateTo : '',
    dateBasis: dateBasis === 'billingDate' ? 'billingDate' : 'paymentDate',
  };
}

export function useIncomeReportFilters() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(new URLSearchParams(searchParams.toString())), [searchParams]);

  const updateFilter = (key: keyof IncomeReportFilters, value: string | IncomeReportDateBasis) => {
    const next = new URLSearchParams(searchParams.toString());
    const normalizedValue = value.trim();
    if (key === 'feeHead') {
      next.delete('feeHead');
      const currentUrl = next.toString() ? `${pathname}?${next.toString()}` : pathname;
      router.replace(updateIncomeReportBillingTitle(currentUrl, normalizedValue || 'all'), { scroll: false });
      return;
    }
    const defaultValue = key === 'dateBasis' ? 'paymentDate' : 'all';
    if (normalizedValue === defaultValue || !normalizedValue) next.delete(key);
    else next.set(key, normalizedValue);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams.toString());
    INCOME_REPORT_FILTER_KEYS.forEach((key) => next.delete(key));
    next.delete('billingTitle');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const isFiltered = INCOME_REPORT_FILTER_KEYS.some((key) => {
    const value = searchParams.get(key);
    return Boolean(value && value !== 'all' && !(key === 'dateBasis' && value === 'paymentDate'));
  });

  return { filters, updateFilter, clearFilters, isFiltered };
}
