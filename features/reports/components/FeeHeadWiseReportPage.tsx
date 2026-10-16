'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { Button } from '@/components/ui/button';
import { IncomeReportFilters } from '@/features/reports/components/IncomeReportFilters';
import { ReportPageShell } from '@/features/reports/components/ReportPageShell';
import { useIncomeReportFilters } from '@/features/reports/hooks/use-income-report-filters';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import type { FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { mapIncomeReportRows } from '@/features/reports/services/income-report.service';
import { downloadReportCsv, reportHeaderCsvRows } from '@/features/reports/utils/report-csv';
import { filterIncomeReportRows, hasValidIncomeReportDateRange } from '@/features/reports/utils/income-report-filters';
import { formatReportAmount, formatReportDate } from '@/features/reports/utils/report-format';
import { toNepaliDigits } from '@/utils/numbers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type FeeHeadReportRow = {
  receipt: ReceiptRecord;
  rowNumber: number;
  amounts: Record<string, number>;
};

const PAGE_SIZE = 15;

function resolveFiscalYear(
  fiscalYears: FiscalYear[],
  value: string,
): FiscalYear | undefined {
  if (!value || value === 'all') return undefined;
  return fiscalYears.find((year) => year.id === value || year.name === value || year.code === value);
}

function getFeeHeadNumber(index: number): string {
  return String(index + 1);
}

function formatReportCurrency(amount: number): string {
  return `रु ${formatReportAmount(amount)}`;
}

function getOperatorName(receipt: ReceiptRecord): string {
  const vehicle = receipt.resourceContent?.vehicle;
  if (!vehicle || typeof vehicle !== 'object' || Array.isArray(vehicle)) return '';
  const record = vehicle as Record<string, unknown>;
  for (const key of ['operatorName', 'driverName', 'operator', 'driver']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function makeReportRows(receipts: ReceiptRecord[], feeHeads: FeeHead[]): FeeHeadReportRow[] {
  const feeHeadIds = new Set(feeHeads.map((feeHead) => feeHead.id));
  return receipts.map((receipt, index) => {
    const amounts: Record<string, number> = {};
    receipt.bill.content.items.forEach((item) => {
      if (!feeHeadIds.has(item.feeHeadId)) return;
      amounts[item.feeHeadId] = (amounts[item.feeHeadId] ?? 0) + item.amount;
    });
    return { receipt, rowNumber: index + 1, amounts };
  });
}

function totalsForRows(rows: FeeHeadReportRow[], feeHeads: FeeHead[]) {
  const amounts: Record<string, number> = {};
  let total = 0;
  rows.forEach(({ receipt, amounts: rowAmounts }) => {
    feeHeads.forEach((feeHead) => {
      amounts[feeHead.id] = (amounts[feeHead.id] ?? 0) + (rowAmounts[feeHead.id] ?? 0);
    });
    total += receipt.totalAmount;
  });
  return { amounts, total };
}

function FeeHeadList({ feeHeads, allFeeHeads }: { feeHeads: FeeHead[]; allFeeHeads: FeeHead[] }) {
  if (feeHeads.length === 0) {
    return <p className="text-xs text-muted-foreground">यस वित्तीय वर्षका लागि शुल्क शीर्षक कन्फिगर गरिएको छैन।</p>;
  }

  return (
    <ol className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {feeHeads.map((feeHead, index) => {
        const originalIndex = allFeeHeads.findIndex((configuredHead) => configuredHead.id === feeHead.id);
        return (
          <li key={feeHead.id} className="flex min-w-0 gap-1.5">
            <span className="shrink-0 font-medium tabular-nums">
              {toNepaliDigits(getFeeHeadNumber(originalIndex >= 0 ? originalIndex : index))}.
            </span>
            <span className="truncate" title={feeHead.name}>{feeHead.name}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function FeeHeadWiseReportPage() {
  const receiptsQuery = useReceipts();
  const billingRules = useBillingRules();
  const { filters, updateFilter, clearFilters, isFiltered } = useIncomeReportFilters();
  const header = useReportHeaderDetails('शीर्षक अनुसार रिपोर्ट', filters.dateFrom, filters.dateTo);
  const [includeHeader, setIncludeHeader] = useState(false);
  const [page, setPage] = useState(1);
  const validDateRange = hasValidIncomeReportDateRange(filters);

  const rawRows = useMemo(() => mapIncomeReportRows(receiptsQuery.records), [receiptsQuery.records]);
  const optionFiscalYears = Array.from(new Set([
    ...billingRules.config.fiscalYears.map((year) => year.name),
    ...receiptsQuery.records.map((receipt) => receipt.fiscalYear),
  ].filter(Boolean))).sort((first, second) => first.localeCompare(second, 'ne'));
  const branches = Array.from(new Set(receiptsQuery.records.map((receipt) => receipt.branchName).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, 'ne'));
  const users = Array.from(new Set(receiptsQuery.records.map((receipt) => receipt.userName).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, 'ne'));

  const selectedFiscalYear = resolveFiscalYear(billingRules.config.fiscalYears, filters.fiscalYear);
  const configuredFeeHeads = useMemo(() => billingRules.config.feeHeads
    .filter((feeHead) => !selectedFiscalYear || feeHead.fiscalYearId === selectedFiscalYear.id),
  [billingRules.config.feeHeads, selectedFiscalYear]);
  const feeHeadOptions = configuredFeeHeads.map((feeHead) => ({
    value: feeHead.id,
    label: feeHead.name,
  }));

  const filteredReceipts = useMemo(() => {
    if (!validDateRange) return [];
    const matchingReceiptIds = new Set(filterIncomeReportRows(rawRows, filters).map((row) => row.receiptId));
    return receiptsQuery.records
      .filter((receipt) => matchingReceiptIds.has(receipt.id))
      .filter((receipt) => !selectedFiscalYear || receipt.bill.content.fiscalYearId === selectedFiscalYear.id)
      .sort((first, second) => second.billingDate.localeCompare(first.billingDate)
        || second.receiptNumber.localeCompare(first.receiptNumber, 'ne'));
  }, [filters, rawRows, receiptsQuery.records, selectedFiscalYear, validDateRange]);

  const allRows = useMemo(() => makeReportRows(filteredReceipts, configuredFeeHeads), [filteredReceipts, configuredFeeHeads]);
  const visibleFeeHeads = useMemo(() => {
    const amounts = totalsForRows(allRows, configuredFeeHeads).amounts;
    return configuredFeeHeads.filter((feeHead) =>
      (filters.feeHead === 'all' || feeHead.id === filters.feeHead)
      && (amounts[feeHead.id] ?? 0) !== 0,
    );
  }, [allRows, configuredFeeHeads, filters.feeHead]);
  const pageCount = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    .map((row, index) => ({ ...row, rowNumber: (currentPage - 1) * PAGE_SIZE + index + 1 }));
  const pageTotals = totalsForRows(pageRows, visibleFeeHeads);
  const allTotals = totalsForRows(allRows, visibleFeeHeads);

  const updateReportFilter = (key: Parameters<typeof updateFilter>[0], value: string) => {
    updateFilter(key, value);
    setPage(1);
  };

  const exportCsv = () => {
    const columns = [
      { label: 'रसिद नं.', value: (row: FeeHeadReportRow) => row.receipt.receiptNumber },
      { label: 'सवारी नं.', value: (row: FeeHeadReportRow) => row.receipt.vehicleNumber },
      { label: 'धनी / सञ्चालक विवरण', value: (row: FeeHeadReportRow) => `${row.receipt.customerName} ${getOperatorName(row.receipt)} ${row.receipt.bill.content.vehicle.phone}`.trim() },
      { label: 'सवारी प्रकार', value: (row: FeeHeadReportRow) => row.receipt.bill.content.vehicle.vehicleType },
      ...visibleFeeHeads.map((feeHead) => ({
        label: `${getFeeHeadNumber(billingRules.config.feeHeads.indexOf(feeHead))}. ${feeHead.name}`,
        value: (row: FeeHeadReportRow) => row.amounts[feeHead.id] ?? 0,
      })),
      { label: 'जम्मा', value: (row: FeeHeadReportRow) => row.receipt.totalAmount },
      { label: 'कैफियत', value: (row: FeeHeadReportRow) => row.receipt.bill.content.note },
    ];
    downloadReportCsv(
      allRows,
      columns,
      'sirsak-anusar-report',
      includeHeader ? reportHeaderCsvRows(header.details) : [],
    );
  };

  const retry = () => {
    void receiptsQuery.reload();
    billingRules.load();
  };
  const error = receiptsQuery.error || billingRules.error;
  const isLoading = receiptsQuery.isLoading || billingRules.isLoading;
  const headerColumns = 7 + visibleFeeHeads.length;

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="शीर्षक अनुसार रिपोर्ट"
        description="वित्तीय वर्षका शुल्क शीर्षकअनुसार रसिद र बिल रकमको विवरण।"
        details={header.details}
        detailsError={header.error}
        includeHeaderDetails={includeHeader}
        onIncludeHeaderDetailsChange={setIncludeHeader}
        onExportCsv={exportCsv}
        exportDisabled={isLoading || Boolean(error) || allRows.length === 0}
      />

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />रिपोर्ट लोड गर्न सकिएन: {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />पुनः प्रयास
          </Button>
        </div>
      ) : null}

      <IncomeReportFilters
        filters={filters}
        fiscalYears={optionFiscalYears}
        branches={branches}
        users={users}
        feeHeads={feeHeadOptions}
        isFiltered={isFiltered}
        onUpdate={updateReportFilter}
        onClear={() => { clearFilters(); setPage(1); }}
        onGenerate={() => {
          setPage(1);
          void receiptsQuery.reload();
          billingRules.load();
        }}
      />

      {!validDateRange ? (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          मिति दायरा मान्य छैन। सुरु मिति अन्तिम मितिभन्दा पछाडि हुन मिल्दैन।
        </p>
      ) : null}

      <section className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4" aria-label="शीर्षक अनुसार रिपोर्ट तालिका">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">शीर्षक अनुसार रसिद विवरण</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">मिति अनुसार समूहबद्ध रसिद विवरण र शुल्क शीर्षकको जम्मा।</p>
          </div>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            जम्मा रेकर्ड: {isLoading || error ? '—' : toNepaliDigits(allRows.length)}
          </span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border/80">
          <Table aria-label="शीर्षक अनुसार रसिद विवरण" className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-14 text-center">सि.नं.</TableHead>
                <TableHead className="min-w-28">रसिद नं.</TableHead>
                <TableHead className="min-w-32">सवारी नं.</TableHead>
                <TableHead className="min-w-44">धनी / सञ्चालक विवरण</TableHead>
                <TableHead className="min-w-28">सवारी प्रकार</TableHead>
                {visibleFeeHeads.map((feeHead) => (
                  <TableHead key={feeHead.id} className="min-w-28 text-right">
                    <span className="block text-[10px] text-muted-foreground">
                      {toNepaliDigits(getFeeHeadNumber(billingRules.config.feeHeads.indexOf(feeHead)))}
                    </span>
                    {feeHead.name}
                  </TableHead>
                ))}
                <TableHead className="min-w-28 text-right">जम्मा</TableHead>
                <TableHead className="min-w-36">कैफियत</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={headerColumns} className="py-10 text-center text-sm text-muted-foreground">रिपोर्ट लोड हुँदैछ...</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={headerColumns} className="py-10 text-center text-sm text-destructive">रिपोर्ट विवरण उपलब्ध छैन। पुनः प्रयास गर्नुहोस्।</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={headerColumns} className="py-10 text-center text-sm text-muted-foreground">छानिएका फिल्टरसँग मिल्ने विवरण भेटिएन।</TableCell></TableRow>
              ) : (
                (() => {
                  const groups = new Map<string, FeeHeadReportRow[]>();
                  pageRows.forEach((row) => {
                    const date = row.receipt.billingDate || '';
                    groups.set(date, [...(groups.get(date) ?? []), row]);
                  });
                  return Array.from(groups.entries()).map(([date, dateRows]) => {
                    const dateTotals = totalsForRows(dateRows, visibleFeeHeads);
                    return [
                      <TableRow key={`date-${date}`} className="bg-muted/60">
                        <TableCell colSpan={headerColumns} className="py-2 font-semibold">
                          बिलिङ मिति: {formatReportDate(date)}
                        </TableCell>
                      </TableRow>,
                      ...dateRows.map((row) => (
                        <TableRow key={row.receipt.id}>
                          <TableCell className="text-center tabular-nums">{toNepaliDigits(row.rowNumber)}</TableCell>
                          <TableCell className="whitespace-nowrap">{toNepaliDigits(row.receipt.receiptNumber)}</TableCell>
                          <TableCell className="whitespace-nowrap">{toNepaliDigits(row.receipt.vehicleNumber)}</TableCell>
                          <TableCell>
                            <span className="block font-medium">{row.receipt.customerName || '—'}</span>
                            {getOperatorName(row.receipt) ? (
                              <span className="block text-xs text-muted-foreground">सञ्चालक: {getOperatorName(row.receipt)}</span>
                            ) : null}
                            <span className="block text-xs text-muted-foreground">
                              {toNepaliDigits([row.receipt.bill.content.vehicle.phone, row.receipt.bill.content.vehicle.address].filter(Boolean).join(' · ') || '—')}
                            </span>
                          </TableCell>
                          <TableCell>{row.receipt.bill.content.vehicle.vehicleType || '—'}</TableCell>
                          {visibleFeeHeads.map((feeHead) => (
                            <TableCell key={feeHead.id} className="text-right tabular-nums">
                              {(row.amounts[feeHead.id] ?? 0) !== 0 ? formatReportCurrency(row.amounts[feeHead.id]) : '—'}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium tabular-nums">{formatReportCurrency(row.receipt.totalAmount)}</TableCell>
                          <TableCell className="max-w-48 truncate" title={row.receipt.bill.content.note}>{row.receipt.bill.content.note || '—'}</TableCell>
                        </TableRow>
                      )),
                      <TableRow key={`subtotal-${date}`} className="bg-muted/30 font-medium">
                        <TableCell colSpan={5} className="text-right">मिति जम्मा</TableCell>
                        {visibleFeeHeads.map((feeHead) => (
                          <TableCell key={feeHead.id} className="text-right tabular-nums">{formatReportCurrency(dateTotals.amounts[feeHead.id] ?? 0)}</TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums">{formatReportCurrency(dateTotals.total)}</TableCell>
                        <TableCell />
                      </TableRow>,
                    ];
                  });
                })()
              )}
              {!isLoading && !error && allRows.length > 0 ? (
                <>
                  <TableRow className="bg-sky-50 font-semibold text-sky-950">
                    <TableCell colSpan={5} className="text-right">यस पृष्ठको जम्मा</TableCell>
                    {visibleFeeHeads.map((feeHead) => (
                      <TableCell key={feeHead.id} className="text-right tabular-nums">{formatReportCurrency(pageTotals.amounts[feeHead.id] ?? 0)}</TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums">{formatReportCurrency(pageTotals.total)}</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow className="bg-emerald-50 font-semibold text-emerald-950">
                    <TableCell colSpan={5} className="text-right">छानिएका सबै रेकर्डको जम्मा</TableCell>
                    {visibleFeeHeads.map((feeHead) => (
                      <TableCell key={feeHead.id} className="text-right tabular-nums">{formatReportCurrency(allTotals.amounts[feeHead.id] ?? 0)}</TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums">{formatReportCurrency(allTotals.total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination page={currentPage} pageSize={PAGE_SIZE} total={allRows.length} onPageChange={setPage} className="mt-3" />
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm" aria-label="सबै शुल्क शीर्षक">
        <h2 className="mb-2 text-sm font-semibold">
          {selectedFiscalYear ? `${selectedFiscalYear.name} का सबै शुल्क शीर्षक` : 'सबै शुल्क शीर्षक'}
        </h2>
        <FeeHeadList feeHeads={configuredFeeHeads} allFeeHeads={billingRules.config.feeHeads} />
      </section>
    </section>
  );
}
