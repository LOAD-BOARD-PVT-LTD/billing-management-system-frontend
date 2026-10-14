'use client';

import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTableColumnHeader, type SortDirection } from '@/components/data-tables/DataTableColumnHeader';
import type { IncomeReportRow } from '@/features/reports/types/income-report';
import type { IncomeReportColumnId } from '@/features/reports/utils/income-report-columns';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export type IncomeReportSortKey = keyof Pick<
  IncomeReportRow,
  'receiptNumber' | 'paymentDate' | 'customerName' | 'branchName' | 'feeTitle' | 'amount' | 'status'
>;

function displayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '—';
  try {
    return toNepaliDigits(convertADtoBS(date).replaceAll('-', '/'));
  } catch {
    return toNepaliDigits(value.replaceAll('-', '/'));
  }
}

function heading(
  label: string,
  column: IncomeReportSortKey,
  sortColumn: IncomeReportSortKey,
  sortDirection: SortDirection,
  onSort: (column: IncomeReportSortKey, direction: SortDirection) => void,
) {
  return (
    <DataTableColumnHeader
      label={label}
      sortDirection={sortColumn === column ? sortDirection : null}
      onSortChange={(direction) => onSort(column, direction)}
    />
  );
}

type IncomeReportTableProps = {
  rows: IncomeReportRow[];
  visibleColumns: IncomeReportColumnId[];
  sortColumn: IncomeReportSortKey;
  sortDirection: SortDirection;
  onSort: (column: IncomeReportSortKey, direction: SortDirection) => void;
  isLoading: boolean;
};

export function IncomeReportTable({ rows, visibleColumns, sortColumn, sortDirection, onSort, isLoading }: IncomeReportTableProps) {
  const allColumns: Record<IncomeReportColumnId, DataTableColumn<IncomeReportRow>> = {
    receiptNumber: { id: 'receiptNumber', header: heading('रसिद नं.', 'receiptNumber', sortColumn, sortDirection, onSort), cell: (row) => <span className="whitespace-nowrap font-medium">{toNepaliDigits(row.receiptNumber)}</span>, headerClassName: 'min-w-32' },
    vehicleNumber: { id: 'vehicleNumber', header: 'गाडी नं. / प्रकार', cell: (row) => <div className="max-w-36"><p className="break-words font-medium">{row.vehicleNumber || '—'}</p><p className="text-xs text-muted-foreground">{row.vehicleType || '—'}</p></div>, headerClassName: 'min-w-36' },
    customerName: { id: 'customerName', header: heading('ग्राहक / सदस्य', 'customerName', sortColumn, sortDirection, onSort), cell: (row) => <span className="block max-w-48 break-words">{row.customerName || '—'}</span>, headerClassName: 'min-w-40' },
    feeTitle: { id: 'feeTitle', header: heading('आम्दानी शीर्षक', 'feeTitle', sortColumn, sortDirection, onSort), cell: (row) => <div className="max-w-48"><p className="break-words">{row.feeTitle || '—'}</p><p className="text-xs text-muted-foreground">ID: {toNepaliDigits(row.feeHeadId || '—')}</p></div>, headerClassName: 'min-w-40' },
    billingEntity: { id: 'billingEntity', header: 'Billing Entity', cell: (row) => <span className="block max-w-40 break-words">{row.billingEntity || '—'}</span>, headerClassName: 'min-w-32' },
    branchName: { id: 'branchName', header: heading('शाखा', 'branchName', sortColumn, sortDirection, onSort), cell: (row) => row.branchName || '—', headerClassName: 'min-w-28' },
    userName: { id: 'userName', header: 'प्रयोगकर्ता', cell: (row) => row.userName || '—', headerClassName: 'min-w-28' },
    paymentMethod: { id: 'paymentMethod', header: 'भुक्तानी विधि', cell: (row) => row.paymentMethod || '—', headerClassName: 'min-w-28' },
    paymentDate: { id: 'paymentDate', header: heading('मिति', 'paymentDate', sortColumn, sortDirection, onSort), cell: (row) => <span className="whitespace-nowrap">{displayDate(row.paymentDate)}</span>, headerClassName: 'min-w-28' },
    amount: { id: 'amount', header: <div className="text-right">{heading('शुल्क रकम', 'amount', sortColumn, sortDirection, onSort)}</div>, cell: (row) => <span className="block whitespace-nowrap text-right tabular-nums">{toNepaliDigits(formatCurrency(row.amount))}</span>, headerClassName: 'min-w-28 text-right', cellClassName: 'text-right' },
    receiptTotal: { id: 'receiptTotal', header: 'रसिद जम्मा', cell: (row) => <span className="block whitespace-nowrap text-right font-medium tabular-nums">{toNepaliDigits(formatCurrency(row.receiptTotal))}</span>, headerClassName: 'min-w-28 text-right', cellClassName: 'text-right' },
    status: { id: 'status', header: heading('स्थिति', 'status', sortColumn, sortDirection, onSort), cell: (row) => {
      const label = row.status === 'PAID' ? 'भुक्तानी' : row.status === 'CANCELLED' ? 'रद्द' : 'बाँकी';
      const style = row.status === 'PAID' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status === 'CANCELLED' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800';
      return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-medium ${style}`}>{label}</span>;
    } },
  };
  const columns: DataTableColumn<IncomeReportRow>[] = [
    { id: 'number', header: 'क्र.सं.', cell: (row) => toNepaliDigits(row.displayNumber ?? '—'), headerClassName: 'w-14' },
    ...visibleColumns.map((id) => allColumns[id]),
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-border/80">
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        loadingLabel="आम्दानी विवरण लोड हुँदैछ..."
        ariaLabel="आम्दानी विवरण"
        emptyState={{ title: 'आम्दानी विवरण भेटिएन', description: 'फिल्टर परिवर्तन गरेर फेरि प्रयास गर्नुहोस्।' }}
        className="min-w-[900px]"
      />
    </div>
  );
}
