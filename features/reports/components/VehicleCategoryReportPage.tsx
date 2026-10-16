'use client';

import { useMemo, useState } from 'react';
import { FilterX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiscalYearSelect } from '@/components/common/filters/FiscalYearSelect';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { ReportPageShell } from '@/features/reports/components/ReportPageShell';
import { useIncomeReportFilters } from '@/features/reports/hooks/use-income-report-filters';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { formatReportAmount, formatReportDate, normalizeReportKey } from '@/features/reports/utils/report-format';
import { downloadReportCsv, reportHeaderCsvRows } from '@/features/reports/utils/report-csv';
import { hasValidIncomeReportDateRange } from '@/features/reports/utils/income-report-filters';
import type { IncomeReportFilters } from '@/features/reports/types/income-report';
import { toNepaliDigits } from '@/utils/numbers';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type VehicleIncomeRow = {
  receipt: ReceiptRecord;
  category: string;
  vehicleType: string;
  route: string;
  routePermitExpiry: string;
  operatorName: string;
  ownerName: string;
  membershipIncome: number;
  otherIncome: number;
  total: number;
};

type Option = { value: string; label: string };

function toDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function fromDateValue(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textValue(record: Record<string, unknown> | null, ...keys: string[]): string {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return '';
}

function categoryForVehicleType(vehicleType: string, categories: VehicleTypeRecord[]): string {
  const key = normalizeReportKey(vehicleType);
  if (!key) return 'वर्ग उपलब्ध छैन';
  return categories.find((category) =>
    category.vehicleTypes.some((type) => normalizeReportKey(type) === key),
  )?.category ?? 'वर्गीकृत नभएको';
}

function getRoutePermit(receipt: ReceiptRecord) {
  const content = asRecord(receipt.resourceContent);
  const vehicle = asRecord(content?.vehicle);
  const compliance = asRecord(vehicle?.Compliance ?? vehicle?.compliance ?? content?.Compliance);
  const routePermit = asRecord(compliance?.RoutePermit ?? compliance?.routePermit ?? vehicle?.RoutePermit);
  return {
    route: textValue(routePermit, 'Route', 'route', 'routeName'),
    expiry: textValue(routePermit, 'ExpiryBs', 'expiryBs', 'ExpiryAd', 'expiryAd', 'expiryDate'),
  };
}

function makeRows(receipts: ReceiptRecord[], categories: VehicleTypeRecord[]): VehicleIncomeRow[] {
  return receipts.map((receipt) => {
    const bill = receipt.bill.content;
    const routePermit = getRoutePermit(receipt);
    const operator = asRecord(asRecord(receipt.resourceContent)?.vehicle);
    const paidAmount = receipt.status === 'PAID' ? receipt.totalAmount : 0;
    return {
      receipt,
      category: categoryForVehicleType(bill.vehicle.vehicleType, categories),
      vehicleType: bill.vehicle.vehicleType || '—',
      route: routePermit.route || '—',
      routePermitExpiry: routePermit.expiry || '—',
      operatorName: textValue(operator, 'operatorName', 'driverName', 'operator', 'driver'),
      ownerName: bill.vehicle.ownerName || '—',
      membershipIncome: paidAmount,
      otherIncome: 0,
      total: paidAmount,
    };
  });
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">{label}</label>
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">सबै</SelectItem>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ReportFilters({
  filters,
  fiscalYears,
  branches,
  feeHeads,
  categories,
  vehicleTypes,
  category,
  vehicleType,
  isFiltered,
  onUpdate,
  onCategoryChange,
  onVehicleTypeChange,
  onClear,
  onGenerate,
}: {
  filters: IncomeReportFilters;
  fiscalYears: string[];
  branches: string[];
  feeHeads: Option[];
  categories: string[];
  vehicleTypes: string[];
  category: string;
  vehicleType: string;
  isFiltered: boolean;
  onUpdate: (key: keyof IncomeReportFilters, value: string) => void;
  onCategoryChange: (value: string) => void;
  onVehicleTypeChange: (value: string) => void;
  onClear: () => void;
  onGenerate: () => void;
}) {
  const fiscalYearOptions = fiscalYears.map((year) => ({ value: year, label: toNepaliDigits(year) }));
  const categoryOptions = categories.map((value) => ({ value, label: value }));
  const typeOptions = vehicleTypes.map((value) => ({ value, label: value }));
  return (
    <section aria-label="सवारी वर्गअनुसार रिपोर्ट फिल्टर" className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">रिपोर्ट फिल्टर</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">सवारी वर्गअनुसार छानेर मासिक आम्दानी रिपोर्ट हेर्नुहोस्।</p>
        </div>
        {isFiltered ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear} className="gap-1.5 text-muted-foreground">
            <FilterX className="h-4 w-4" aria-hidden="true" /> फिल्टर हटाउनुहोस्
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium" htmlFor="vehicle-report-fiscal-year">वित्तीय वर्ष</label>
          <FiscalYearSelect id="vehicle-report-fiscal-year" value={filters.fiscalYear} onChange={(value) => onUpdate('fiscalYear', value)} optionsOverride={fiscalYearOptions} includeAllOption />
        </div>
        <FilterSelect id="vehicle-report-branch" label="शाखा" value={filters.branch} options={branches.map((value) => ({ value, label: value }))} onChange={(value) => onUpdate('branch', value)} />
        <FilterSelect id="vehicle-report-fee-head" label="आम्दानी शीर्षक" value={filters.feeHead} options={feeHeads} onChange={(value) => onUpdate('feeHead', value)} />
        <FilterSelect id="vehicle-report-category" label="वाहन श्रेणी" value={category} options={categoryOptions} onChange={onCategoryChange} />
        <FilterSelect id="vehicle-report-type" label="सवारी साधन प्रकार" value={vehicleType} options={typeOptions} onChange={onVehicleTypeChange} />
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium">बाट मिति</legend>
          <NepaliDatePicker value={toDateValue(filters.dateFrom)} onChange={(date) => onUpdate('dateFrom', fromDateValue(date))} placeholder="मिति छान्नुहोस्" />
        </fieldset>
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium">सम्म मिति</legend>
          <NepaliDatePicker value={toDateValue(filters.dateTo)} onChange={(date) => onUpdate('dateTo', fromDateValue(date))} placeholder="मिति छान्नुहोस्" />
        </fieldset>
      </div>
      <div className="mt-4 flex justify-end border-t border-border/70 pt-3">
        <Button type="button" size="sm" onClick={onGenerate} className="gap-2">
          <RefreshCw className="size-3.5" aria-hidden="true" /> रिपोर्ट तयार गर्नुहोस्
        </Button>
      </div>
    </section>
  );
}

function ReportPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const firstRecord = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(currentPage * pageSize, total);
  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <label htmlFor="vehicle-report-page-size">प्रति पेज रेकर्ड</label>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger id="vehicle-report-page-size" className="h-9 w-20 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{toNepaliDigits(size)}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-2">{toNepaliDigits(firstRecord)}–{toNepaliDigits(lastRecord)} / {toNepaliDigits(total)}</span>
      </div>
      <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label="रिपोर्ट पृष्ठहरू">
        <span className="mr-1 text-xs text-muted-foreground">पृष्ठ {toNepaliDigits(currentPage)} / {toNepaliDigits(pageCount)}</span>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage <= 1} onClick={() => onPageChange(1)}><span aria-hidden="true">«</span><span className="hidden sm:inline">पहिलो</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><span aria-hidden="true">‹</span><span className="hidden sm:inline">अघिल्लो</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}><span className="hidden sm:inline">अर्को</span><span aria-hidden="true">›</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage >= pageCount} onClick={() => onPageChange(pageCount)}><span className="hidden sm:inline">अन्तिम</span><span aria-hidden="true">»</span></Button>
      </nav>
    </div>
  );
}

function getRowTotals(rows: VehicleIncomeRow[]) {
  return rows.reduce((totals, row) => ({
    membership: totals.membership + row.membershipIncome,
    other: totals.other + row.otherIncome,
    total: totals.total + row.total,
  }), { membership: 0, other: 0, total: 0 });
}

export function VehicleCategoryReportPage() {
  const receiptsQuery = useReceipts();
  const vehicleTypeQuery = useVehicleTypes();
  const { filters, updateFilter, clearFilters, isFiltered } = useIncomeReportFilters();
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [includeHeader, setIncludeHeader] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const header = useReportHeaderDetails('सवारी वर्गअनुसार मासिक आम्दानी रिपोर्ट', filters.dateFrom, filters.dateTo);
  const validDateRange = hasValidIncomeReportDateRange(filters);

  const fiscalYears = Array.from(new Set(receiptsQuery.records.map((receipt) => receipt.fiscalYear).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, 'ne'));
  const branches = Array.from(new Set(receiptsQuery.records.map((receipt) => receipt.branchName).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, 'ne'));
  const feeHeads = Array.from(new Map(receiptsQuery.records.flatMap((receipt) => receipt.bill.content.items)
    .filter((item) => item.feeHeadId)
    .map((item) => [item.feeHeadId, { value: item.feeHeadId, label: item.title || item.feeHeadId }])).values())
    .sort((first, second) => first.label.localeCompare(second.label, 'ne'));
  const categories = Array.from(new Set(vehicleTypeQuery.records.map((record) => record.category)))
    .sort((first, second) => first.localeCompare(second, 'ne'));
  const availableTypes = Array.from(new Set(vehicleTypeQuery.records
    .filter((record) => categoryFilter === 'all' || record.category === categoryFilter)
    .flatMap((record) => record.vehicleTypes)))
    .sort((first, second) => first.localeCompare(second, 'ne'));
  const reportRows = useMemo(() => makeRows(receiptsQuery.records, vehicleTypeQuery.records), [receiptsQuery.records, vehicleTypeQuery.records]);
  const allFilteredRows = reportRows.filter((row) => {
    const receipt = row.receipt;
    const date = receipt.billingDate;
    const hasSelectedFeeHead = filters.feeHead === 'all'
      || receipt.bill.content.items.some((item) => item.feeHeadId === filters.feeHead || item.title === filters.feeHead);
    return validDateRange
      && (filters.fiscalYear === 'all' || receipt.fiscalYear === filters.fiscalYear)
      && (filters.branch === 'all' || receipt.branchName === filters.branch)
      && hasSelectedFeeHead
      && (categoryFilter === 'all' || row.category === categoryFilter)
      && (vehicleTypeFilter === 'all' || row.vehicleType === vehicleTypeFilter)
      && (!filters.dateFrom || date >= filters.dateFrom)
      && (!filters.dateTo || date <= filters.dateTo);
  });
  const pageCount = Math.max(1, Math.ceil(allFilteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = allFilteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageTotals = getRowTotals(pageRows);
  const filteredTotals = getRowTotals(allFilteredRows);
  const error = receiptsQuery.error || vehicleTypeQuery.loadError;
  const isLoading = receiptsQuery.isLoading || vehicleTypeQuery.isLoading;

  const updateReportFilter = (key: keyof IncomeReportFilters, value: string) => {
    updateFilter(key, value);
    setPage(1);
  };
  const clearReportFilters = () => {
    clearFilters();
    setCategoryFilter('all');
    setVehicleTypeFilter('all');
    setPage(1);
  };
  const exportCsv = () => downloadReportCsv(
    allFilteredRows.map((row) => ({
      vehicleNumber: row.receipt.vehicleNumber,
      vehicleType: row.vehicleType,
      route: row.route,
      routePermitExpiry: row.routePermitExpiry,
      ownerName: row.ownerName,
      operatorName: row.operatorName,
      note: row.receipt.bill.content.note,
      receiptNumber: row.receipt.receiptNumber,
      membershipIncome: row.membershipIncome,
      otherIncome: row.otherIncome,
      total: row.total,
      periodMonths: row.receipt.bill.content.billingMonths,
      paymentMethod: row.receipt.paymentMethod,
      billingDate: row.receipt.billingDate,
      periodStart: row.receipt.bill.content.periodStart,
      periodEnd: row.receipt.bill.content.periodEnd,
    })),
    [
      { label: 'गाडी नं.', value: (row) => row.vehicleNumber },
      { label: 'सवारी प्रकार', value: (row) => row.vehicleType },
      { label: 'रुट परमिट', value: (row) => row.route },
      { label: 'रुट परमिट म्याद समाप्ति मिति', value: (row) => row.routePermitExpiry },
      { label: 'धनीको नाम', value: (row) => `${row.operatorName ? `सञ्चालक: ${row.operatorName} ` : ''}धनीको नाम: ${row.ownerName}` },
      { label: 'कैफियत', value: (row) => row.note },
      { label: 'रसिद नं.', value: (row) => row.receiptNumber },
      { label: 'सदस्यताबाट', value: (row) => row.membershipIncome },
      { label: 'अन्य आम्दानी', value: (row) => row.otherIncome },
      { label: 'जम्मा', value: (row) => row.total },
      { label: 'अवधि महिना', value: (row) => row.periodMonths },
      { label: 'भुक्तानी तरिका', value: (row) => row.paymentMethod },
      { label: 'का. मिति', value: (row) => row.billingDate },
      { label: 'देखि', value: (row) => row.periodStart },
      { label: 'सम्म', value: (row) => row.periodEnd },
    ],
    'vehicle-category-income-report',
    includeHeader ? reportHeaderCsvRows(header.details) : [],
  );

  const retry = () => {
    void receiptsQuery.reload();
    void vehicleTypeQuery.reload().catch((cause: unknown) => {
      toast({
        title: 'सवारी वर्ग विवरण लोड गर्न सकिएन',
        description: cause instanceof Error ? cause.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    });
  };
  const onGenerate = () => {
    setPage(1);
    void receiptsQuery.reload();
    void vehicleTypeQuery.reload().catch((cause: unknown) => {
      toast({
        title: 'रिपोर्ट ताजा गर्न सकिएन',
        description: cause instanceof Error ? cause.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    });
  };

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="सवारी वर्गअनुसार रिपोर्ट"
        description="वित्तीय वर्ष, शाखा, आम्दानी शीर्षक, सवारी वर्ग र मितिअनुसार मासिक आम्दानी विवरण।"
        details={header.details}
        detailsError={header.error || vehicleTypeQuery.loadError || undefined}
        includeHeaderDetails={includeHeader}
        onIncludeHeaderDetailsChange={setIncludeHeader}
        onExportCsv={exportCsv}
        exportDisabled={isLoading || Boolean(error) || allFilteredRows.length === 0}
      />
      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>रिपोर्ट लोड गर्न सकिएन: {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="gap-2">
            <RefreshCw className="size-3.5" aria-hidden="true" /> पुनः प्रयास
          </Button>
        </div>
      ) : null}

      <ReportFilters
        filters={filters}
        fiscalYears={fiscalYears}
        branches={branches}
        feeHeads={feeHeads}
        categories={categories}
        vehicleTypes={availableTypes}
        category={categoryFilter}
        vehicleType={vehicleTypeFilter}
        isFiltered={isFiltered || categoryFilter !== 'all' || vehicleTypeFilter !== 'all'}
        onUpdate={updateReportFilter}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setVehicleTypeFilter('all');
          setPage(1);
        }}
        onVehicleTypeChange={(value) => {
          setVehicleTypeFilter(value);
          setPage(1);
        }}
        onClear={clearReportFilters}
        onGenerate={onGenerate}
      />
      {!validDateRange ? (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          मिति दायरा मान्य छैन। सुरु मिति अन्तिम मितिभन्दा पछाडि हुन मिल्दैन।
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm" aria-label="सवारी वर्गअनुसार आम्दानी विवरण">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">मासिक आम्दानी विवरण</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">फिल्टरसँग मिल्ने रसिद: {isLoading || error ? '—' : toNepaliDigits(allFilteredRows.length)}</p>
          </div>
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            पृष्ठ {toNepaliDigits(currentPage)} / {toNepaliDigits(pageCount)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table aria-label="सवारी वर्गअनुसार मासिक आम्दानी रिपोर्ट" className="min-w-[1900px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-14 text-center">सि.नं.</TableHead>
                <TableHead className="min-w-32">गाडी नं.</TableHead>
                <TableHead className="min-w-32">सवारी प्रकार</TableHead>
                <TableHead className="min-w-28">रुट परमिट</TableHead>
                <TableHead className="min-w-36">रुट परमिट म्याद समाप्ति मिति</TableHead>
                <TableHead className="min-w-48">धनीको नाम</TableHead>
                <TableHead className="min-w-36">कैफियत</TableHead>
                <TableHead className="min-w-32">रसिद नं.</TableHead>
                <TableHead className="min-w-32 text-right">सदस्यताबाट</TableHead>
                <TableHead className="min-w-32 text-right">अन्य आम्दानी</TableHead>
                <TableHead className="min-w-32 text-right">जम्मा</TableHead>
                <TableHead className="min-w-24 text-center">अवधि महिना</TableHead>
                <TableHead className="min-w-28">भुक्तानी तरिका</TableHead>
                <TableHead className="min-w-32">का. मिति</TableHead>
                <TableHead className="min-w-32">देखि</TableHead>
                <TableHead className="min-w-32">सम्म</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={16} className="h-36 text-center text-sm text-muted-foreground">रिपोर्ट विवरण लोड हुँदैछ...</TableCell></TableRow>
              ) : error ? (
                <TableRow><TableCell colSpan={16} className="h-36 text-center text-sm text-destructive">रिपोर्ट लोड भएन। माथिको पुनः प्रयास विकल्प प्रयोग गर्नुहोस्।</TableCell></TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow><TableCell colSpan={16} className="h-36 text-center text-sm text-muted-foreground">छानिएका फिल्टरसँग मिल्ने विवरण भेटिएन।</TableCell></TableRow>
              ) : (
                pageRows.map((row, index) => (
                  <TableRow key={row.receipt.id} className={index % 2 === 1 ? 'bg-muted/20' : undefined}>
                    <TableCell className="text-center tabular-nums">{toNepaliDigits((currentPage - 1) * pageSize + index + 1)}</TableCell>
                    <TableCell className="font-medium">{toNepaliDigits(row.receipt.vehicleNumber)}</TableCell>
                    <TableCell className="whitespace-normal">{row.vehicleType}</TableCell>
                    <TableCell>{row.route}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.routePermitExpiry === '—' ? '—' : formatReportDate(row.routePermitExpiry)}</TableCell>
                    <TableCell className="whitespace-normal">
                      {row.operatorName ? <span className="block text-xs text-muted-foreground">सञ्चालक: {row.operatorName}</span> : null}
                      <span className="block text-xs">धनीको नाम: {row.ownerName}</span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate" title={row.receipt.bill.content.note}>{row.receipt.bill.content.note || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{toNepaliDigits(row.receipt.receiptNumber)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(row.membershipIncome)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(row.otherIncome)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatReportAmount(row.total)}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.receipt.bill.content.billingMonths ? toNepaliDigits(row.receipt.bill.content.billingMonths) : '—'}</TableCell>
                    <TableCell>{row.receipt.paymentMethod || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatReportDate(row.receipt.billingDate)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatReportDate(row.receipt.bill.content.periodStart)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatReportDate(row.receipt.bill.content.periodEnd)}</TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && !error && allFilteredRows.length > 0 ? (
                <>
                  <TableRow className="bg-muted/70 font-semibold">
                    <TableCell colSpan={8}>यस पृष्ठको जम्मा</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(pageTotals.membership)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(pageTotals.other)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(pageTotals.total)}</TableCell>
                    <TableCell colSpan={5} className="text-center">—</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/5 font-semibold text-primary">
                    <TableCell colSpan={8}>छानिएका सबै रेकर्डको जम्मा</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(filteredTotals.membership)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(filteredTotals.other)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatReportAmount(filteredTotals.total)}</TableCell>
                    <TableCell colSpan={5} className="text-center">—</TableCell>
                  </TableRow>
                </>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <ReportPagination
          page={currentPage}
          pageSize={pageSize}
          total={allFilteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
    </section>
  );
}
