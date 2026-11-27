'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { ReceiptFilters, ReceiptRecord } from '@/features/receipts/model/receipt';
import {
  buildReceiptSearchIndex,
  filterReceiptRecords,
} from '@/features/receipts/utils/receipt-search';

const EMPTY_FILTERS: ReceiptFilters = { search: '', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' };

export function useReceiptFilters(
  records: ReceiptRecord[],
  fiscalYear: string,
  systemUsers: readonly Pick<UserRecord, 'name' | 'email'>[] = [],
) {
  const [filters, setFilters] = useState<ReceiptFilters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(filters.search),
      filters.search.trim() ? 150 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  const effectiveSearch = filters.search.trim() ? debouncedSearch : '';

  const searchIndexMap = useMemo(() => {
    const map = new Map<ReceiptRecord, ReturnType<typeof buildReceiptSearchIndex>>();
    for (const receipt of records) {
      map.set(receipt, buildReceiptSearchIndex(receipt));
    }
    return map;
  }, [records]);

  const filteredRecords = useMemo(() => filterReceiptRecords({
    records,
    filters: { ...filters, search: effectiveSearch },
    fiscalYear,
    systemUsers,
    searchIndexMap,
  }), [effectiveSearch, filters, fiscalYear, records, searchIndexMap, systemUsers]);

  const updateFilter = <K extends keyof ReceiptFilters>(key: K, value: ReceiptFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const flushSearch = useCallback(() => {
    setDebouncedSearch(filters.search);
  }, [filters.search]);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch('');
  };

  const isFiltered = Object.entries(filters).some(([key, value]) => key === 'search' ? Boolean(value.trim()) : value !== 'all' && Boolean(value));

  return { filters, updateFilter, flushSearch, clearFilters, filteredRecords, isFiltered };
}