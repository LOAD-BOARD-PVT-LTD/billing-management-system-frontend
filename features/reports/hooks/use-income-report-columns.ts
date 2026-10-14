'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_INCOME_REPORT_COLUMNS,
  INCOME_REPORT_COLUMN_OPTIONS,
  REQUIRED_INCOME_REPORT_COLUMNS,
  type IncomeReportColumnId,
} from '@/features/reports/utils/income-report-columns';

const PREFERENCE_KEY = 'billing.income-report.visible-columns.v1';

function validColumns(value: unknown): IncomeReportColumnId[] | null {
  if (!Array.isArray(value)) return null;
  const validIds = new Set<string>(INCOME_REPORT_COLUMN_OPTIONS.map((column) => column.id));
  const selected = value.filter((item): item is IncomeReportColumnId => typeof item === 'string' && validIds.has(item));
  if (!REQUIRED_INCOME_REPORT_COLUMNS.every((id) => selected.includes(id))) return null;
  return Array.from(new Set(selected));
}

export function useIncomeReportColumns() {
  const [visibleColumns, setVisibleColumns] = useState<IncomeReportColumnId[]>(DEFAULT_INCOME_REPORT_COLUMNS);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(PREFERENCE_KEY);
        if (!stored) return;
        const parsed = validColumns(JSON.parse(stored) as unknown);
        if (parsed) setVisibleColumns(parsed);
      } catch {
        window.localStorage.removeItem(PREFERENCE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const applyColumns = (columns: IncomeReportColumnId[]) => {
    const valid = validColumns(columns);
    if (!valid) return;
    setVisibleColumns(valid);
    try {
      window.localStorage.setItem(PREFERENCE_KEY, JSON.stringify(valid));
    } catch {
      // Keep the applied columns for this session if storage is unavailable.
    }
  };

  const resetColumns = () => applyColumns(DEFAULT_INCOME_REPORT_COLUMNS);
  return { visibleColumns, applyColumns, resetColumns };
}
