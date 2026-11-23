'use client';

import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTableColumnHeader, type SortDirection } from '@/components/data-tables/DataTableColumnHeader';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import type { IncomeReportRow } from '@/features/reports/types/income-report';
import type { IncomeReportColumnId } from '@/features/reports/utils/income-report-columns';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export type IncomeReportSortKey = keyof Pick<
  IncomeReportRow,
  'vehicleNumber' | 'vehicleType' | 'customerName' | 'receiptNumber' | 'membershipIncome' | 'otherIncome' | 'receiptTotal' | 'billingMonths' | 'paymentMethod' | 'paymentDate' | 'periodStart' | 'periodEnd'
>;

function displayDate(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return toNepaliDigits(value.replaceAll('-', '/'));
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
    vehicleNumber: {
      id: 'vehicleNumber',
      header: heading('गाडी नं.', 'vehicleNumber', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="block max-w-40 break-words font-medium">{row.vehicleNumber || '—'}</span>,
      headerClassName: 'min-w-36',
    },
    vehicleType: {
      id: 'vehicleType',
      header: heading('सवारी प्रकार', 'vehicleType', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap">{row.vehicleType || '—'}</span>,
      headerClassName: 'min-w-28',
    },
    customerName: {
      id: 'customerName',
      header: heading('धनीको नाम', 'customerName', sortColumn, sortDirection, onSort),
      cell: (row) => {
        const lines = getMemberOwnerDisplayLines(row.customerName, row.operatorName);
        if (lines.length === 0) return '—';
        return (
          <div className="max-w-52 space-y-0.5">
            {lines.map((line) => (
              <p key={`${line.label}-${line.name}`} className="break-words text-xs leading-snug">
                {line.label ? <span className="text-muted-foreground">{line.label} </span> : null}
                <span className="font-medium">{line.name}{line.suffix}</span>
              </p>
            ))}
          </div>
        );
      },
      headerClassName: 'min-w-44',
    },
    note: {
      id: 'note',
      header: 'कैफियत',
      cell: (row) => <span className="block max-w-44 break-words text-xs">{row.note || '—'}</span>,
      headerClassName: 'min-w-32',
    },
    receiptNumber: {
      id: 'receiptNumber',
      header: heading('रसिद नं.', 'receiptNumber', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap font-medium">{toNepaliDigits(row.receiptNumber)}</span>,
      headerClassName: 'min-w-28',
    },
    membershipIncome: {
      id: 'membershipIncome',
      header: <div className="text-right">{heading('सदस्यताबाट', 'membershipIncome', sortColumn, sortDirection, onSort)}</div>,
      cell: (row) => <span className="block whitespace-nowrap text-right tabular-nums">{toNepaliDigits(formatCurrency(row.membershipIncome))}</span>,
      headerClassName: 'min-w-28 text-right',
      cellClassName: 'text-right',
    },
    otherIncome: {
      id: 'otherIncome',
      header: <div className="text-right">{heading('अन्य आम्दानी', 'otherIncome', sortColumn, sortDirection, onSort)}</div>,
      cell: (row) => <span className="block whitespace-nowrap text-right tabular-nums">{toNepaliDigits(formatCurrency(row.otherIncome))}</span>,
      headerClassName: 'min-w-28 text-right',
      cellClassName: 'text-right',
    },
    receiptTotal: {
      id: 'receiptTotal',
      header: <div className="text-right">{heading('जम्मा', 'receiptTotal', sortColumn, sortDirection, onSort)}</div>,
      cell: (row) => <span className="block whitespace-nowrap text-right font-medium tabular-nums">{toNepaliDigits(formatCurrency(row.receiptTotal))}</span>,
      headerClassName: 'min-w-28 text-right',
      cellClassName: 'text-right',
    },
    billingMonths: {
      id: 'billingMonths',
      header: heading('अवधि महिना', 'billingMonths', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="block text-center tabular-nums">{row.billingMonths > 0 ? toNepaliDigits(row.billingMonths) : '—'}</span>,
      headerClassName: 'min-w-24 text-center',
      cellClassName: 'text-center',
    },
    paymentMethod: {
      id: 'paymentMethod',
      header: heading('भुक्तानी तरिका', 'paymentMethod', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap">{row.paymentMethod || '—'}</span>,
      headerClassName: 'min-w-28',
    },
    paymentDate: {
      id: 'paymentDate',
      header: heading('का. मिति', 'paymentDate', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap">{displayDate(row.paymentDate)}</span>,
      headerClassName: 'min-w-28',
    },
    periodStart: {
      id: 'periodStart',
      header: heading('देखि', 'periodStart', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap">{displayDate(row.periodStart)}</span>,
      headerClassName: 'min-w-28',
    },
    periodEnd: {
      id: 'periodEnd',
      header: heading('सम्म', 'periodEnd', sortColumn, sortDirection, onSort),
      cell: (row) => <span className="whitespace-nowrap">{displayDate(row.periodEnd)}</span>,
      headerClassName: 'min-w-28',
    },
  };

  const columns: DataTableColumn<IncomeReportRow>[] = [
    { id: 'number', header: 'सि.नं.', cell: (row) => toNepaliDigits(row.displayNumber ?? '—'), headerClassName: 'w-14' },
    ...visibleColumns.map((id) => allColumns[id]),
  ];

  return (
    <div className="overflow-x-auto rounded-md border border-border/80">
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.receiptId}
        isLoading={isLoading}
        loadingLabel="आम्दानी विवरण लोड हुँदैछ..."
        ariaLabel="आम्दानी विवरण"
        emptyState={{ title: 'आम्दानी विवरण भेटिएन', description: 'फिल्टर परिवर्तन गरेर फेरि प्रयास गर्नुहोस्।' }}
        className="min-w-[1100px]"
      />
    </div>
  );
}
