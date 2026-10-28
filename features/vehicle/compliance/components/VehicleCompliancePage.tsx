'use client';

import { useMemo, useState } from 'react';
import { Download, Filter, RefreshCw, Search } from 'lucide-react';
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
import { useOrganization } from '@/contexts/organization-context';
import {
  bikramSambatToGregorian,
  parseBikramSambatDate,
} from '@/utils/nepali-calender-dates/nepali-date';
import { toNepaliDigits } from '@/utils/numbers';

const PAGE_SIZE = 25;
const NARAYANI_BRANCH = 'Narayani Sangh Hetauda';

const DOCUMENT_OPTIONS = [
  { value: 'all', label: 'सबै कागजात' },
  { value: 'insurance', label: 'बीमा' },
  { value: 'bluebook', label: 'ब्लुबुक' },
  { value: 'routePermit', label: 'रुट परमिट' },
  { value: 'checkPass', label: 'जाँचपास' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'सबै मिति' },
  { value: 'expired', label: 'म्याद सकिएको' },
  { value: 'valid', label: 'वैध' },
  { value: 'unknown', label: 'मिति उपलब्ध छैन' },
] as const;

type DocumentKey = (typeof DOCUMENT_OPTIONS)[number]['value'];
type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
type DocumentStatus = Exclude<StatusFilter, 'all'>;

const DOCUMENT_LABELS: Record<Exclude<DocumentKey, 'all'>, string> = {
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

function documentPeriod(vehicle: MemberVehicleDetails, key: Exclude<DocumentKey, 'all'>) {
  return vehicle.compliance[key];
}

function vehicleSearchText(vehicle: MemberVehicleDetails): string {
  return [
    vehicle.vehicleNumber,
    vehicle.vehicleId,
    vehicle.tqmsVehicleType,
    vehicle.sawariDhaniName,
    vehicle.sanchalakName,
    vehicle.phone,
  ].join(' ').toLocaleLowerCase();
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

function downloadVehicleCsv(vehicles: MemberVehicleDetails[], documentKey: DocumentKey) {
  const visibleDocuments = documentKey === 'all'
    ? (['insurance', 'bluebook', 'routePermit', 'checkPass'] as const)
    : [documentKey] as const;
  const documentHeaders = visibleDocuments.map((key) => DOCUMENT_LABELS[key]);
  const headers = ['सवारी नम्बर', 'सवारी प्रकार', 'धनीको नाम', 'सञ्चालक', 'फोन', ...documentHeaders];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = vehicles.map((vehicle) => [
    vehicle.vehicleNumber || vehicle.vehicleId,
    vehicle.tqmsVehicleType,
    vehicle.sawariDhaniName,
    vehicle.sanchalakName,
    vehicle.phone,
    ...visibleDocuments.map((key) => {
      const period = documentPeriod(vehicle, key);
      return period.expiryBs || period.expiryAd || 'मिति उपलब्ध छैन';
    }),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vehicle-compliance.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VehicleCompliancePage() {
  const { vehicles, isLoading, isRefreshing, lastSyncedAt, error, reload } = useMemberVehicles();
  const { organization } = useOrganization();
  const [search, setSearch] = useState('');
  const [documentKey, setDocumentKey] = useState<DocumentKey>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [vehicleType, setVehicleType] = useState('all');
  const [page, setPage] = useState(1);

  const isNarayaniBilling = `${organization.nameEnglish} ${organization.nameNepali}`
    .toLocaleLowerCase()
    .includes('narayani');
  const scopedVehicles = useMemo(() => (
    isNarayaniBilling
      ? vehicles.filter((vehicle) => vehicle.branch.trim().toLocaleLowerCase() === NARAYANI_BRANCH.toLocaleLowerCase())
      : vehicles
  ), [isNarayaniBilling, vehicles]);

  const vehicleTypes = useMemo(
    () => [...new Set(scopedVehicles.map((vehicle) => vehicle.tqmsVehicleType).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ne')),
    [scopedVehicles],
  );

  const filteredVehicles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return scopedVehicles
      .filter((vehicle) => !term || vehicleSearchText(vehicle).includes(term))
      .filter((vehicle) => vehicleType === 'all' || vehicle.tqmsVehicleType === vehicleType)
      .filter((vehicle) => {
        if (statusFilter === 'all') return true;
        if (documentKey === 'all') {
          return (['insurance', 'bluebook', 'routePermit', 'checkPass'] as const)
            .some((key) => documentStatus(documentPeriod(vehicle, key)) === statusFilter);
        }
        return documentStatus(documentPeriod(vehicle, documentKey)) === statusFilter;
      })
      .sort((left, right) => left.vehicleNumber.localeCompare(right.vehicleNumber, 'ne'));
  }, [documentKey, scopedVehicles, search, statusFilter, vehicleType]);

  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageVehicles = filteredVehicles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const visibleDocuments = documentKey === 'all'
    ? (['insurance', 'bluebook', 'routePermit', 'checkPass'] as const)
    : [documentKey] as const;

  const clearFilters = () => {
    setSearch('');
    setDocumentKey('all');
    setStatusFilter('all');
    setVehicleType('all');
    setPage(1);
  };
  const hasFilters = Boolean(search.trim())
    || documentKey !== 'all'
    || statusFilter !== 'all'
    || vehicleType !== 'all';

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => downloadVehicleCsv(filteredVehicles, documentKey)}
            disabled={filteredVehicles.length === 0}
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
            value={documentKey}
            onValueChange={(value) => {
              setDocumentKey(value as DocumentKey);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 min-w-36 flex-1">
              <SelectValue placeholder="कागजात प्रकार" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <h2 className="font-semibold">बक्यौता / म्याद सूची</h2>
            <p className="mt-0.5 text-xs text-muted-foreground" aria-live="polite">
              {toNepaliDigits(filteredVehicles.length)} सवारी
              {lastSyncedAt ? ` · अन्तिम sync ${lastSyncedAt.toLocaleString('ne-NP')}` : ''}
              {isNarayaniBilling ? ` · ${NARAYANI_BRANCH}` : ''}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {visibleDocuments.map((key) => DOCUMENT_LABELS[key]).join(' · ')}
          </span>
        </div>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            TQMS सवारी विवरण लोड गर्न सकिएन: {error}
          </p>
        ) : isLoading ? (
          <LoadingSpinner label="TQMS सवारी विवरण लोड हुँदैछ" size="sm" className="justify-center py-8" />
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
                  {visibleDocuments.map((key) => (
                    <TableHead key={key} className="h-9">{DOCUMENT_LABELS[key]} मिति</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageVehicles.map((vehicle, index) => (
                  <TableRow key={vehicle.vehicleId} className="align-middle">
                    <TableCell className="py-2 text-center text-xs text-muted-foreground tabular-nums">
                      {toNepaliDigits((currentPage - 1) * PAGE_SIZE + index + 1)}
                    </TableCell>
                    <TableCell className="py-2 font-medium">{vehicle.vehicleNumber || '—'}</TableCell>
                    <TableCell className="py-2">{vehicle.tqmsVehicleType || '—'}</TableCell>
                    <TableCell className="py-2">
                      <p>{vehicle.sawariDhaniName || '—'}</p>
                      {vehicle.sanchalakName && vehicle.sanchalakName !== vehicle.sawariDhaniName ? (
                        <p className="text-xs text-muted-foreground">सञ्चालक: {vehicle.sanchalakName}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap">{vehicle.phone || '—'}</TableCell>
                    {visibleDocuments.map((key) => (
                      <TableCell key={key} className="py-2">
                        <ExpiryCell period={documentPeriod(vehicle, key)} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {pageVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + visibleDocuments.length} className="h-24 text-center text-sm text-muted-foreground">
                      {scopedVehicles.length ? 'फिल्टरसँग मिल्ने सवारी भेटिएन।' : 'TQMS मा सवारी विवरण भेटिएन।'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && !error ? (
          <DataTablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filteredVehicles.length}
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
