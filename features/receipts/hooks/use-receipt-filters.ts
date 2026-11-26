'use client';

import { useEffect, useMemo, useState } from 'react';

import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { ReceiptFilters, ReceiptRecord } from '@/features/receipts/model/receipt';
import {
  matchesReceiptBranchFilter,
  matchesReceiptUserFilter,
} from '@/features/receipts/utils/receipt-filter-options';

const EMPTY_FILTERS: ReceiptFilters = { search: '', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' };

export function useReceiptFilters(
  records: ReceiptRecord[],
  fiscalYear: string,
  systemUsers: readonly Pick<UserRecord, 'name' | 'email'>[] = [],
) {
  const [filters, setFilters] = useState<ReceiptFilters>(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim().toLocaleLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  const filteredRecords = useMemo(() => records.filter((receipt) => {
    const searchable = `${receipt.vehicleNumber} ${receipt.receiptNumber} ${receipt.customerName} ${receipt.billingType === 'MEMBERSHIP' ? receipt.bill.content.vehicle.operatorName ?? '' : ''}`.toLocaleLowerCase();
    return (!debouncedSearch || searchable.includes(debouncedSearch))
      && (fiscalYear === 'all' || receipt.fiscalYear === fiscalYear)
      && (!filters.dateFrom || receipt.paymentDate >= filters.dateFrom)
      && (!filters.dateTo || receipt.paymentDate <= filters.dateTo)
      && matchesReceiptBranchFilter(receipt.branchName, filters.branch)
      && matchesReceiptUserFilter(receipt, filters.user, systemUsers)
      && (filters.status === 'all' || receipt.status === filters.status);
  }), [debouncedSearch, fiscalYear, filters.branch, filters.dateFrom, filters.dateTo, filters.status, filters.user, records, systemUsers]);

  const updateFilter = <K extends keyof ReceiptFilters>(key: K, value: ReceiptFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setDebouncedSearch('');
  };

  const isFiltered = Object.entries(filters).some(([key, value]) => key === 'search' ? Boolean(value.trim()) : value !== 'all' && Boolean(value));

  return { filters, updateFilter, clearFilters, filteredRecords, isFiltered };
}