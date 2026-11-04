'use client';

import { useMemo, useState } from 'react';
import { Download, Filter, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MemberVehicleDetails, VehicleDocumentPeriod } from '@/features/members/api/member-vehicle.api';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import { useArrearsRuleSettings } from '@/features/vehicle/compliance/hooks/useArrearsRuleSettings';
import { getArrearsListRows, type ArrearsListRow, type ArrearsView } from '@/features/vehicle/compliance/utils/arrears-list';
import {
  bikramSambatToGregorian,
  parseBikramSambatDate,
} from '@/utils/nepali-calender-dates/nepali-date';
import { toNepaliDigits } from '@/utils/numbers';

const PAGE_SIZE = 25;
const DOCUMENT_OPTIONS = [
  { value: 'insurance', label: 'बीमा' },
  { value: 'bluebook', label: 'ब्लुबुक' },
  { value: 'routePermit', label: 'रुट परमिट' },
  { value: 'checkPass', label: 'जाँचपास' },
] as const;

const VIEW_OPTIONS: { value: ArrearsView; label: string }[] = [
  { value: 'membership', label: 'सदस्यता' },
  { value: 'neverBilled', label: 'कहिल्यै बिल नतिरेको' },
  { value: 'paidExpired', label: 'तिरेको तर म्याद सकिएको' },
  { value: 'monthlyPaid', label: 'मासिक तिरेको' },
  ...DOCUMENT_OPTIONS,
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'सबै मिति' },
  { value: 'expired', label: 'म्याद सकिएको' },
  { value: 'valid', label: 'वैध' },
  { value: 'unknown', label: 'मिति उपलब्ध छैन' },
] as const;

const PHONE_OPTIONS = [
  { value: 'all', label: 'सबै फोन अवस्था' },
  { value: 'hasPhone', label: 'फोन नम्बर भएको' },
  { value: 'noPhone', label: 'फोन नम्बर नभएको' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
type DocumentStatus = Exclude<StatusFilter, 'all'>;
type PhoneFilter = (typeof PHONE_OPTIONS)[number]['value'];

const DOCUMENT_LABELS: Record<Extract<ArrearsView, 'insurance' | 'bluebook' | 'routePermit' | 'checkPass'>, string> = {
  insurance: 'बीमा',
  bluebook: 'ब्लुबुक',
  routePermit: 'रुट परमिट',
  checkPass: 'जाँचपास',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  expired: 'म्याद सकियो',
  valid: 'वैध',
  unknown: 'जाँच आवश्यक',
};

function parseAdDate(value: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toWesternDigits(value.trim()));
  if (!dateOnly) {
    const parsed = new Date(toWesternDigits(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const year = Number(dateOnly[1]);
  const month = Number(dateOnly[2]);
  const day = Number(dateOnly[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}

function expiryDate(period: VehicleDocumentPeriod): Date | null {
  const adDate = parseAdDate(period.expiryAd);
  if (adDate) return adDate;
  if (!period.expiryBs) return null;

  try {
    const parts = parseBikramSambatDate(toWesternDigits(period.expiryBs));
    return parts ? bikramSambatToGregorian(parts) : null;
  } catch {
    return null;
  }
}

function toWesternDigits(value: string): string {
  return value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
}

function documentStatus(period: VehicleDocumentPeriod): DocumentStatus {
  const expiry = expiryDate(period);
  if (!expiry) return 'unknown';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today ? 'expired' : 'valid';
}

function documentPeriod(
  vehicle: MemberVehicleDetails,
  key: Extract<ArrearsView, 'insurance' | 'bluebook' | 'routePermit' | 'checkPass'>,
) {
  return vehicle.compliance[key];
}

function formatExpiry(value: string): string {
  return value ? toNepaliDigits(value.replaceAll('-', '/')) : '—';
}

function ExpiryCell({ period }: { period: VehicleDocumentPeriod }) {
  const status = documentStatus(period);
  const date = period.expiryBs || period.expiryAd;
  const dateLabel = period.expiryBs ? 'वि.सं.' : 'ई.सं.';
  const statusVariant = status === 'expired' ? 'destructive' : status === 'valid' ? 'secondary' : 'outline';

  return (
    <div className="flex min-w-24 flex-col items-start gap-1">
      <span className="whitespace-nowrap text-xs tabular-nums">
        {date ? `${dateLabel} ${formatExpiry(date)}` : 'मिति छैन'}
      </span>
      <Badge variant={statusVariant} className="h-5 px-1.5 text-[10px]">
        {STATUS_LABELS[status]}
      </Badge>
    </div>
  );
}

function downloadArrearsCsv(rows: ArrearsListRow[], view: ArrearsView) {
  const headers = ['सवारी नम्बर', 'सवारी प्रकार', 'धनीको नाम', 'सञ्चालक', 'फोन नम्बर', 'रसिद नम्बर', 'भुक्तानी मिति', 'म्याद'];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const data = rows.map((row) => [
    row.vehicleNumber,
    row.vehicleType,
    row.ownerName,
    row.operatorName,
    row.phone,
    row.receiptNumber,
    row.billingDate,
    row.expiryDate,
  ]);
  const csv = [headers, ...data].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `bakyauda-myad-${view}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VehicleCompliancePage() {
  const { vehicles, branchFilter, isLoading, isRefreshing, lastSyncedAt, error, reload } = useMemberVehicles();
  const receiptsQuery = useReceipts();
  const arrearsSettingsQuery = useArrearsRuleSettings();
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<ArrearsView>('membership');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>('all');
  const [vehicleType, setVehicleType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const scopedVehicles = vehicles;
  const isDocumentView = ['insurance', 'bluebook', 'routePermit', 'checkPass'].includes(viewType);
  const documentKey = isDocumentView ? viewType as keyof typeof DOCUMENT_LABELS : null;

  const vehicleTypes = useMemo(
    () => [...new Set(scopedVehicles.map((vehicle) => vehicle.tqmsVehicleType).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ne')),
    [scopedVehicles],
  );

  const listRows = useMemo(() => getArrearsListRows({
    view: viewType,
    vehicles: scopedVehicles,
    receipts: receiptsQuery.records,
    paidExpiredRuleId: arrearsSettingsQuery.settings?.paidExpired.billingRuleId ?? '',
    monthlyFiscalYearId: arrearsSettingsQuery.settings?.monthlyPaid.fiscalYearId ?? '',
    monthlyRuleId: arrearsSettingsQuery.settings?.monthlyPaid.billingRuleId ?? '',
    branchFilter,
  }), [
    arrearsSettingsQuery.settings,
    branchFilter,
    receiptsQuery.records,
    scopedVehicles,
    viewType,
  ]);
  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return listRows
      .filter((row) => !term || [
        row.vehicleNumber,
        row.vehicleType,
        row.ownerName,
        row.operatorName,
        row.phone,
        row.receiptNumber,
      ].join(' ').toLocaleLowerCase().includes(term))
      .filter((row) => vehicleType === 'all' || row.vehicleType === vehicleType)
      .filter((row) => phoneFilter === 'all' || (phoneFilter === 'hasPhone' ? Boolean(row.phone.trim()) : !row.phone.trim()))
      .filter((row) => {
        if (isDocumentView || (!dateFrom && !dateTo)) return true;
        const date = row.billingDate.slice(0, 10);
        return Boolean(date) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
      })
      .filter((row) => {
        if (!isDocumentView || statusFilter === 'all') return true;
        const period = row.vehicle && documentKey ? documentPeriod(row.vehicle, documentKey) : null;
        return period ? documentStatus(period) === statusFilter : statusFilter === 'unknown';
      })
      .sort((left, right) => left.vehicleNumber.localeCompare(right.vehicleNumber, 'ne'));
  }, [dateFrom, dateTo, documentKey, isDocumentView, listRows, phoneFilter, search, statusFilter, vehicleType]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const clearFilters = () => {
    setSearch('');
    setViewType('membership');
    setStatusFilter('all');
    setPhoneFilter('all');
    setVehicleType('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };
  const hasFilters = Boolean(search.trim())
    || viewType !== 'membership'
    || statusFilter !== 'all'
    || phoneFilter !== 'all'
    || vehicleType !== 'all'
    || Boolean(dateFrom || dateTo);
  const isLoadingList = isLoading || receiptsQuery.isLoading || arrearsSettingsQuery.isLoading;
  const combinedError = error || receiptsQuery.error || arrearsSettingsQuery.error;
  const listRuleDisabled = (viewType === 'paidExpired' && !arrearsSettingsQuery.settings?.paidExpired.enabled)
    || (viewType === 'monthlyPaid' && !arrearsSettingsQuery.settings?.monthlyPaid.enabled);
  const viewLabel = VIEW_OPTIONS.find((option) => option.value === viewType)?.label ?? 'सदस्यता';

  return (
    <section className="space-y-3 pb-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">बक्यौता / म्याद सूची</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            सदस्यता बक्यौता र सवारी कागजातको म्याद हेर्नुहोस्।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">हेर्ने प्रकार</span>
          <Select
            value={viewType}
            onValueChange={(value) => {
              setViewType(value as ArrearsView);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-48" aria-label="सूची हेर्ने प्रकार">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => downloadArrearsCsv(filteredRows, viewType)}
            disabled={filteredRows.length === 0}
          >
            <Download aria-hidden="true" className="size-4" />
            Excel निर्यात
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="सवारी विवरण ताजा गर्नुहोस्"
            title="सवारी विवरण ताजा गर्नुहोस्"
            onClick={() => void reload()}
            disabled={isRefreshing}
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <Card className="space-y-3 rounded-lg border-border/80 p-3 shadow-sm sm:p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Filter aria-hidden="true" className="size-4 text-muted-foreground" />
          फिल्टर गर्नुहोस्
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="relative min-w-56 flex-[2]">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="सवारी, धनी वा फोन खोज्नुहोस्"
              aria-label="सवारी, धनी वा फोन खोज्नुहोस्"
              className="h-9 pl-8"
            />
          </div>
          <Select
            value={vehicleType}
            onValueChange={(value) => {
              setVehicleType(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-40 flex-1">
              <SelectValue placeholder="सवारी प्रकार" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">सबै सवारी प्रकार</SelectItem>
              {vehicleTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            value={phoneFilter}
            onValueChange={(value) => {
              setPhoneFilter(value as PhoneFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-40 flex-1">
              <SelectValue placeholder="फोन अवस्था" />
            </SelectTrigger>
            <SelectContent>
              {PHONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isDocumentView ? (
            <>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                aria-label="भुक्तानी मिति सुरु"
                title="भुक्तानी मिति सुरु"
                className="h-9 min-w-36 flex-1"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                aria-label="भुक्तानी मिति अन्त्य"
                title="भुक्तानी मिति अन्त्य"
                className="h-9 min-w-36 flex-1"
              />
            </>
          ) : null}
          {isDocumentView ? (
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 min-w-36 flex-1">
                <SelectValue placeholder="म्याद स्थिति" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {hasFilters ? (
            <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={clearFilters}>
              फिल्टर हटाउनुहोस्
            </Button>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3 overflow-hidden rounded-lg border-border/80 p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{viewLabel} सूची</h2>
            <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
              {toNepaliDigits(filteredRows.length)} सवारी
              {lastSyncedAt ? ` · अन्तिम sync ${lastSyncedAt.toLocaleString('ne-NP')}` : ''}
              {branchFilter ? ` · ${branchFilter}` : ''}
            </p>
          </div>
          {isDocumentView && documentKey ? (
            <span className="text-xs text-muted-foreground">{DOCUMENT_LABELS[documentKey]} म्याद</span>
          ) : null}
        </div>

        {combinedError ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            सूची विवरण लोड गर्न सकिएन: {combinedError}
          </p>
        ) : isLoadingList ? (
          <LoadingSpinner label="बक्यौता तथा म्याद विवरण लोड हुँदैछ" size="sm" className="justify-center py-8" />
        ) : listRuleDisabled ? (
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <p className="text-sm font-medium">{viewLabel} सूचीका लागि नियम सक्रिय छैन।</p>
            <p className="mt-1 text-xs text-muted-foreground">एडमिन सेटिङ्सबाट नियम सक्रिय गरी बिलिङ नियम छान्नुहोस्।</p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/dashboard/settings?tab=billing-rules">एडमिन सेटिङ्स खोल्नुहोस्</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="h-9 w-12 text-center">क्र.सं.</TableHead>
                  <TableHead className="h-9">सवारी नम्बर</TableHead>
                  <TableHead className="h-9">वाहन श्रेणी</TableHead>
                  <TableHead className="h-9">धनीको नाम</TableHead>
                  <TableHead className="h-9">फोन नम्बर</TableHead>
                  {isDocumentView
                    ? <TableHead className="h-9">{documentKey ? DOCUMENT_LABELS[documentKey] : ''} मिति</TableHead>
                    : <>
                      <TableHead className="h-9">रसिद नं.</TableHead>
                      <TableHead className="h-9">भुक्तानी मिति</TableHead>
                      <TableHead className="h-9">म्याद</TableHead>
                    </>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, index) => (
                  <TableRow key={row.key} className="align-middle">
                    <TableCell className="py-2 text-center text-xs text-muted-foreground tabular-nums">
                      {toNepaliDigits((currentPage - 1) * PAGE_SIZE + index + 1)}
                    </TableCell>
                    <TableCell className="py-2 font-medium">{row.vehicleNumber || '—'}</TableCell>
                    <TableCell className="py-2">{row.vehicleType || '—'}</TableCell>
                    <TableCell className="py-2">
                      {getMemberOwnerDisplayLines(row.ownerName, row.operatorName).map((ownerLine) => (
                        <p key={`${ownerLine.label}:${ownerLine.name}`} className={ownerLine.label ? 'text-xs' : ''}>
                          {ownerLine.label ? <span className="text-muted-foreground">{ownerLine.label} </span> : null}
                          {ownerLine.name}
                        </p>
                      ))}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{row.phone || '—'}</TableCell>
                    {isDocumentView && row.vehicle && documentKey
                      ? <TableCell className="py-2"><ExpiryCell period={documentPeriod(row.vehicle, documentKey)} /></TableCell>
                      : <>
                        <TableCell className="py-2">{row.receiptNumber || '—'}</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">{row.billingDate ? formatExpiry(row.billingDate) : '—'}</TableCell>
                        <TableCell className="py-2 whitespace-nowrap">{row.expiryDate ? formatExpiry(row.expiryDate) : '—'}</TableCell>
                      </>}
                  </TableRow>
                ))}
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isDocumentView ? 6 : 8} className="h-24 text-center text-sm text-muted-foreground">
                      {listRuleDisabled
                        ? 'एडमिन सेटिङ्सबाट यस सूचीको नियम सक्रिय गर्नुहोस्।'
                        : 'फिल्टरसँग मिल्ने सवारी भेटिएन।'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoadingList && !combinedError && !listRuleDisabled ? (
          <DataTablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredRows.length}
            onPageChange={setPage}
            formatNumber={toNepaliDigits}
            labels={{
              ariaLabel: 'सवारी सूची पृष्ठ',
              showing: 'देखाइएको',
              of: 'मध्ये',
              page: 'पृष्ठ',
              previousPage: 'अघिल्लो पृष्ठ',
              nextPage: 'अर्को पृष्ठ',
            }}
          />
        ) : null}
      </Card>
    </section>
  );
}
