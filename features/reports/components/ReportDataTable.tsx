'use client';

import { useMemo, useState } from 'react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { Input } from '@/components/ui/input';
import { toNepaliDigits } from '@/utils/numbers';

type ReportDataTableProps<TRow> = {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  searchableText: (row: TRow) => string;
  getRowId: (row: TRow) => string;
  isLoading: boolean;
  loadingLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  searchLabel?: string;
  pageSize?: number;
};

export function ReportDataTable<TRow>({
  rows,
  columns,
  searchableText,
  getRowId,
  isLoading,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  searchLabel = 'विवरण खोज्नुहोस्',
  pageSize = 25,
}: ReportDataTableProps<TRow>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return rows;
    return rows.filter((row) => searchableText(row).toLocaleLowerCase().includes(query));
  }, [rows, search, searchableText]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows
    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
    .map((row, index) => ({ row, reportIndex: (currentPage - 1) * pageSize + index + 1 }));
  const numberedColumns: DataTableColumn<(typeof pageRows)[number]>[] = [
    {
      id: 'report-row-number',
      header: 'सि.नं.',
      cell: (entry) => toNepaliDigits(entry.reportIndex),
      headerClassName: 'w-16',
    },
    ...columns.map((column) => ({
      ...column,
      cell: (entry: (typeof pageRows)[number]) => column.cell(entry.row),
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          placeholder={searchLabel}
          aria-label={searchLabel}
          className="w-full sm:max-w-sm"
        />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          जम्मा विवरण: {toNepaliDigits(filteredRows.length)}
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border border-border/80">
        <DataTable
          columns={numberedColumns}
          data={pageRows}
          getRowId={(entry) => getRowId(entry.row)}
          isLoading={isLoading}
          loadingLabel={loadingLabel}
          emptyState={{ title: emptyTitle, description: emptyDescription }}
          className="min-w-[900px]"
        />
      </div>
      <DataTablePagination page={currentPage} pageSize={pageSize} total={filteredRows.length} onPageChange={setPage} />
    </div>
  );
}
