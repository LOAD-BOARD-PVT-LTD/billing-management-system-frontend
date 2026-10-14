'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Download, FileDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { useToast } from '@/components/ui/use-toast';
import { IncomeReportColumnMenu } from '@/features/reports/components/IncomeReportColumnMenu';
import { IncomeReportFilters } from '@/features/reports/components/IncomeReportFilters';
import { IncomeReportTable, type IncomeReportSortKey } from '@/features/reports/components/IncomeReportTable';
import { useIncomeReportColumns } from '@/features/reports/hooks/use-income-report-columns';
import { useIncomeReport } from '@/features/reports/hooks/use-income-report';
import { useIncomeReportFilters } from '@/features/reports/hooks/use-income-report-filters';
import { downloadIncomeReportCsv, openIncomeReportPrintView } from '@/features/reports/services/income-report.service';
import { filterIncomeReportRows, getIncomeReportDateLabel, getIncomeReportExportLabel, hasValidIncomeReportDateRange } from '@/features/reports/utils/income-report-filters';
import type { IncomeReportFilters as IncomeReportFilterValues, IncomeReportRow } from '@/features/reports/types/income-report';
import type { SortDirection } from '@/components/data-tables/DataTableColumnHeader';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

const PAGE_SIZE = 15;

function sortValue(row: IncomeReportRow, column: IncomeReportSortKey): string | number {
  const value = row[column];
  return typeof value === 'number' ? value : String(value ?? '');
}

function summaryTotal(rows: IncomeReportRow[]): number {
  const totalsByReceipt = new Map<string, number>();
  rows.forEach((row) => {
    if (row.status === 'PAID') totalsByReceipt.set(row.receiptId, row.receiptTotal);
  });
  return Array.from(totalsByReceipt.values()).reduce((total, amount) => total + amount, 0);
}

function summaryTransactions(rows: IncomeReportRow[]): number {
  return new Set(rows.filter((row) => row.status === 'PAID').map((row) => row.receiptId)).size;
}

function dateInput(value: string): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  try {
    return toNepaliDigits(convertADtoBS(parsed).replaceAll('-', '/'));
  } catch {
    return value;
  }
}

function SummaryCard({ label, value, description, accent }: { label: string; value: string; description: string; accent: string }) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${accent}`} aria-hidden="true" />
      </div>
    </article>
  );
}

export function IncomeReportPage() {
  const { rows, isLoading, error, reload } = useIncomeReport();
  const { filters, updateFilter, clearFilters, isFiltered } = useIncomeReportFilters();
  const { visibleColumns, applyColumns } = useIncomeReportColumns();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<IncomeReportSortKey>('paymentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const validDateRange = hasValidIncomeReportDateRange(filters);

  const filteredRows = useMemo(() => filterIncomeReportRows(rows, filters), [rows, filters]);
  const sortedRows = useMemo(() => {
    if (!sortDirection) return filteredRows;
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filteredRows].sort((first, second) => {
      const left = sortValue(first, sortColumn);
      const right = sortValue(second, sortColumn);
      return (typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'ne')) * direction;
    });
  }, [filteredRows, sortColumn, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedRows
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    .map((row, index) => ({ ...row, displayNumber: (currentPage - 1) * PAGE_SIZE + index + 1 }));
  const fiscalYears = Array.from(new Set(rows.map((row) => row.fiscalYear).filter(Boolean))).sort();
  const branches = Array.from(new Set(rows.map((row) => row.branchName).filter(Boolean))).sort();
  const users = Array.from(new Set(rows.map((row) => row.userName).filter(Boolean))).sort();
  const feeHeads = Array.from(new Map(rows
    .filter((row) => row.feeHeadId)
    .map((row) => [row.feeHeadId, { value: row.feeHeadId, label: row.feeTitle ? `${row.feeTitle} (${row.feeHeadId})` : row.feeHeadId }])).values())
    .sort((first, second) => first.label.localeCompare(second.label, 'ne'));

  const updateReportFilter = (key: keyof IncomeReportFilterValues, value: string) => {
    updateFilter(key, value);
    setPage(1);
  };

  const exportExcel = () => downloadIncomeReportCsv(sortedRows, getIncomeReportExportLabel(filters), visibleColumns);
  const exportPdf = () => {
    if (!openIncomeReportPrintView(sortedRows, getIncomeReportDateLabel(filters))) {
      toast({
        title: 'PDF निर्यात सुरु गर्न सकिएन',
        description: 'ब्राउजरमा नयाँ विन्डो खोल्ने अनुमति दिनुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-4 pb-8">
      <header className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">आम्दानी प्रतिवेदन</span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">आम्दानी रिपोर्ट</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">छानिएको अवधिको रसिद-आधारित आम्दानी तथा सङ्कलन विवरण हेर्नुहोस्।</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <IncomeReportColumnMenu visibleColumns={visibleColumns} onApply={applyColumns} />
            <Button type="button" variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={exportExcel} disabled={isLoading || Boolean(error) || sortedRows.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />Excel मा निर्यात
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={exportPdf} disabled={isLoading || Boolean(error)}>
              <FileDown className="h-4 w-4" aria-hidden="true" />PDF मा निर्यात
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-sky-100 pt-3 text-xs text-muted-foreground">
          <span>स्रोत: BillResource रसिद विवरण</span>
          <span>मिति आधार: {filters.dateBasis === 'paymentDate' ? 'भुक्तानी मिति' : 'बिलिङ मिति'}</span>
          <span>अवधि: {dateInput(filters.dateFrom) || '—'} {filters.dateTo ? `देखि ${dateInput(filters.dateTo)}` : 'देखि हालसम्म'}</span>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />आम्दानी विवरण लोड गर्न सकिएन: {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()} className="gap-2"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />पुनः प्रयास</Button>
        </div>
      ) : null}

      <IncomeReportFilters
        filters={filters}
        fiscalYears={fiscalYears}
        branches={branches}
        users={users}
        feeHeads={feeHeads}
        isFiltered={isFiltered}
        onUpdate={updateReportFilter}
        onClear={() => { clearFilters(); setPage(1); }}
      />

      {!validDateRange ? (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          मिति दायरा मान्य छैन। सुरु मिति अन्तिम मितिभन्दा पछाडि हुन मिल्दैन।
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="कुल आम्दानी / सङ्कलन"
          value={isLoading || error ? '—' : `रु ${formatCurrency(summaryTotal(filteredRows))}`}
          description="भुक्तानी भएका मिल्ने रसिदको जम्मा"
          accent="bg-sky-500"
        />
        <SummaryCard
          label="सफल सङ्कलन"
          value={isLoading || error ? '—' : toNepaliDigits(summaryTransactions(filteredRows))}
          description="भुक्तानी भएका छुट्टाछुट्टै रसिद"
          accent="bg-emerald-500"
        />
      </div>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5" aria-label="आम्दानी विवरण तालिका">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">आम्दानी विवरण तालिका</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">शुल्क विवरणमा item रकम र त्यसको रसिद जम्मा छुट्टाछुट्टै देखाइएको छ।</p>
          </div>
          <span className="text-xs text-muted-foreground" aria-live="polite">कुल रेकर्ड: {isLoading || error ? '—' : toNepaliDigits(sortedRows.length)}</span>
        </div>
        <IncomeReportTable
          rows={pageRows}
          visibleColumns={visibleColumns}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={(column, direction) => { setSortColumn(column); setSortDirection(direction); }}
          isLoading={isLoading}
        />
        <DataTablePagination page={currentPage} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPage} className="mt-3" />
      </section>

      <aside className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950">
        रिपोर्ट हालको BillResource/रसिद API बाट तयार हुन्छ; छुट्टै आम्दानी रिपोर्ट endpoint वा बिलिङ प्रकारको field उपलब्ध छैन। शुल्क रकम item मा रहेको छुट-अघिको रकम हो, जबकि summary ले मिल्ने paid receipt को जम्मा देखाउँछ; bill-level छुटलाई शीर्षकअनुसार बाँड्ने backend field छैन। paidAt नहुँदा भुक्तानी मिति बिलिङ मितिमा fallback हुन्छ। status नआएमा हालको receipt parser ले PAID मान्ने भएकाले backend बाट status उपलब्ध नभएका रेकर्डमा सफल सङ्कलन गलत रूपमा देखिन सक्छ। हालको `all` response parser ले पृष्ठहरू छुट्टाछुट्टै माग्दैन; API ले pagination दिएमा पछिल्ला पृष्ठ यहाँ समेटिँदैनन्।
      </aside>
    </section>
  );
}
