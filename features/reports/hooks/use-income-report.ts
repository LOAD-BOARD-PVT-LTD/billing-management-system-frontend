'use client';

import { useMemo } from 'react';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { mapIncomeReportRows } from '@/features/reports/services/income-report.service';

export function useIncomeReport() {
  const receipts = useReceipts();
  const rows = useMemo(() => mapIncomeReportRows(receipts.records), [receipts.records]);

  return {
    rows,
    isLoading: receipts.isLoading,
    error: receipts.error,
    reload: receipts.reload,
  };
}
