import type { IncomeReportFilters, IncomeReportRow } from '@/features/reports/types/income-report';

export const INCOME_REPORT_FILTER_KEYS = [
  'fiscalYear',
  'branch',
  'user',
  'billType',
  'feeHead',
  'dateFrom',
  'dateTo',
  'dateBasis',
  'billingTitle',
] as const;

export function isValidDateFilter(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function hasValidIncomeReportDateRange(filters: IncomeReportFilters): boolean {
  return (!filters.dateFrom || isValidDateFilter(filters.dateFrom))
    && (!filters.dateTo || isValidDateFilter(filters.dateTo))
    && (!filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo);
}

export function filterIncomeReportRows(
  rows: IncomeReportRow[],
  filters: IncomeReportFilters,
): IncomeReportRow[] {
  if (!hasValidIncomeReportDateRange(filters)) return [];

  return rows.filter((row) => {
    const date = filters.dateBasis === 'billingDate' ? row.billingDate : row.paymentDate;
    return (filters.fiscalYear === 'all' || row.fiscalYear === filters.fiscalYear)
      && (filters.branch === 'all' || row.branchName === filters.branch)
      && (filters.user === 'all' || row.userName === filters.user)
      && (filters.feeHead === 'all' || row.feeHeadId === filters.feeHead || row.feeTitle === filters.feeHead)
      && (!filters.dateFrom || date >= filters.dateFrom)
      && (!filters.dateTo || date <= filters.dateTo);
  });
}

export function getIncomeReportExportLabel(filters: IncomeReportFilters): string {
  const from = filters.dateFrom || 'all';
  const to = filters.dateTo || 'all';
  return `aamdani-report-${from}-to-${to}`;
}

export function getIncomeReportDateLabel(filters: IncomeReportFilters): string {
  if (filters.dateFrom && filters.dateTo) return `${filters.dateFrom} — ${filters.dateTo}`;
  if (filters.dateFrom) return `${filters.dateFrom} देखि`;
  if (filters.dateTo) return `${filters.dateTo} सम्म`;
  return 'सबै मिति';
}
