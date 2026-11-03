'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileDown, RefreshCw, Search } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/data-tables/DataTable';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTqmsMemberRegistry } from '@/features/vehicle/tqms/hooks/useTqmsMemberRegistry';
import type { TqmsRegistryVehicle } from '@/features/vehicle/tqms/model/tqms-member-registry';
import { toNepaliDigits } from '@/utils/numbers';
import { downloadDocument, renderPdfPages } from '@/shared/document-generation';

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const PDF_ROWS_PER_PAGE = 30;
type VehicleNumberSummary = {
  uniqueNumbers: string[];
  duplicateNumbers: Array<{ number: string; count: number }>;
};

function summarizeVehicleNumbers(rows: TqmsRegistryVehicle[]): VehicleNumberSummary {
  const numberGroups = new Map<string, { number: string; count: number }>();
  rows.forEach((row) => {
    const number = row.vehicleNumber.trim();
    const key = (row.normalizedVehicleNumber || number).trim().toLocaleLowerCase();
    if (!key || !number || number === '—') return;
    const existing = numberGroups.get(key);
    if (existing) existing.count += 1;
    else numberGroups.set(key, { number, count: 1 });
  });
  const groupedNumbers = [...numberGroups.values()].sort((left, right) => left.number.localeCompare(right.number, 'ne'));
  return {
    uniqueNumbers: groupedNumbers.map(({ number }) => number),
    duplicateNumbers: groupedNumbers.filter(({ count }) => count > 1),
  };
}

function downloadCsv(rows: TqmsRegistryVehicle[]) {
  const columns: Array<[string, (row: TqmsRegistryVehicle) => string]> = [
    ['सवारी नम्बर', (row) => row.vehicleNumber],
    ['सवारी प्रकार', (row) => row.vehicleType],
    ['सञ्चालक', (row) => row.operatorName ?? row.vehicleOwnerName],
    ['सवारी धनी', (row) => row.vehicleOwnerName],
    ['फोन नम्बर', (row) => row.phone],
    ['संघ शाखा', (row) => row.branch],
    ['स्थिति', (row) => row.status],
    ['ठेगाना', (row) => row.address],
    ['नागरिकता नम्बर', (row) => row.citizenshipNumber],
  ];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = [
    columns.map(([label]) => escape(label)).join(','),
    ...rows.map((row) => columns.map(([, value]) => escape(value(row))).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tqms-member-registry.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function RegistryPagination({
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <label htmlFor="tqms-page-size">प्रति पेज रेकर्ड</label>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger id="tqms-page-size" className="h-9 w-20 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>{PAGE_SIZE_OPTIONS.map((size) => <SelectItem key={size} value={String(size)}>{toNepaliDigits(size)}</SelectItem>)}</SelectContent>
        </Select>
        <span className="ml-2">{toNepaliDigits(firstRecord)}–{toNepaliDigits(lastRecord)} / {toNepaliDigits(total)}</span>
      </div>
      <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label="सदस्य सूची पृष्ठहरू">
        <span className="mr-1 text-xs text-muted-foreground">पृष्ठ {toNepaliDigits(currentPage)} / {toNepaliDigits(pageCount)}</span>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage <= 1} onClick={() => onPageChange(1)}><span aria-hidden="true">«</span><span className="hidden sm:inline">पहिलो</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}><span aria-hidden="true">‹</span><span className="hidden sm:inline">अघिल्लो</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage >= pageCount} onClick={() => onPageChange(currentPage + 1)}><span className="hidden sm:inline">अर्को</span><span aria-hidden="true">›</span></Button>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1 px-2.5" disabled={currentPage >= pageCount} onClick={() => onPageChange(pageCount)}><span className="hidden sm:inline">अन्तिम</span><span aria-hidden="true">»</span></Button>
      </nav>
    </div>
  );
}

export function TqmsMemberRegistryPage() {
  const { vehicles, branchFilter, isLoading, isRefreshing, error, reload } = useTqmsMemberRegistry();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim().toLocaleLowerCase()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status.trim().toUpperCase() === 'ACTIVE'),
    [vehicles],
  );

  const filteredVehicles = useMemo(() => {
    if (!debouncedSearch) return activeVehicles;
    return activeVehicles.filter((vehicle) => [
      vehicle.vehicleNumber,
      vehicle.normalizedVehicleNumber,
      vehicle.vehicleType,
      vehicle.vehicleOwnerName,
      vehicle.operatorName ?? '',
      vehicle.phone,
      vehicle.branch,
      vehicle.status,
    ].join(' ').toLocaleLowerCase().includes(debouncedSearch));
  }, [activeVehicles, debouncedSearch]);
  const vehicleNumberSummary = useMemo(
    () => summarizeVehicleNumbers(filteredVehicles),
    [filteredVehicles],
  );
  const pdfPages = useMemo(() => {
    const pages: Array<{
      title: string;
      description: string;
      rows: Array<{ number: string; count?: number }>;
      duplicates: boolean;
    }> = [];
    for (let start = 0; start < vehicleNumberSummary.uniqueNumbers.length; start += PDF_ROWS_PER_PAGE) {
      pages.push({
        title: 'सवारी नम्बर',
        description: `जम्मा अद्वितीय सवारी: ${toNepaliDigits(vehicleNumberSummary.uniqueNumbers.length)}`,
        rows: vehicleNumberSummary.uniqueNumbers
          .slice(start, start + PDF_ROWS_PER_PAGE)
          .map((number) => ({ number })),
        duplicates: false,
      });
    }
    for (let start = 0; start < vehicleNumberSummary.duplicateNumbers.length; start += PDF_ROWS_PER_PAGE) {
      pages.push({
        title: 'दोहोरो सवारी नम्बर',
        description: `दोहोरो नम्बर भएका सवारी: ${toNepaliDigits(vehicleNumberSummary.duplicateNumbers.length)}`,
        rows: vehicleNumberSummary.duplicateNumbers
          .slice(start, start + PDF_ROWS_PER_PAGE)
          .map(({ number, count }) => ({ number, count })),
        duplicates: true,
      });
    }
    return pages;
  }, [vehicleNumberSummary]);

  const pageCount = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filteredVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const columns: DataTableColumn<TqmsRegistryVehicle>[] = [
    {
      id: 'vehicleNumber',
      header: 'सवारी नम्बर',
      cell: (vehicle) => <span className="font-medium">{vehicle.vehicleNumber}</span>,
      headerClassName: 'min-w-44',
    },
    {
      id: 'vehicleType',
      header: 'सवारी प्रकार',
      cell: (vehicle) => vehicle.vehicleType,
      headerClassName: 'min-w-32',
    },
    {
      id: 'owner',
      header: 'सवारी धनी / सञ्चालक',
      cell: (vehicle) => (
        <div className="max-w-64 space-y-0.5">
          <p className="break-words">{vehicle.vehicleOwnerName}</p>
          {vehicle.operatorName && vehicle.operatorName !== vehicle.vehicleOwnerName ? <p className="break-words text-xs text-muted-foreground">सञ्चालक: {vehicle.operatorName}</p> : null}
          {vehicle.address ? <p className="line-clamp-2 break-words text-[11px] text-muted-foreground">{vehicle.address}</p> : null}
        </div>
      ),
      headerClassName: 'min-w-52',
    },
    {
      id: 'phone',
      header: 'फोन नम्बर',
      cell: (vehicle) => <span className="whitespace-nowrap">{vehicle.phone || '—'}{vehicle.isDummyPhoneUsed ? <span className="ml-1 text-[10px] text-amber-700" title="TQMS ले dummy phone जनाएको छ">(dummy)</span> : null}</span>,
      headerClassName: 'min-w-32',
    },
    {
      id: 'branch',
      header: 'संघ शाखा',
      cell: (vehicle) => vehicle.branch || '—',
      headerClassName: 'min-w-32',
    },
    {
      id: 'status',
      header: 'स्थिति',
      cell: (vehicle) => <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${vehicle.status.toUpperCase() === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{vehicle.status}</span>,
      headerClassName: 'min-w-24',
    },
  ];

  const changePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setPdfError(null);
    try {
      const root = pdfContentRef.current;
      if (!root) throw new Error('PDF सामग्री उपलब्ध छैन।');
      if (pdfPages.length === 0) throw new Error('डाउनलोड गर्न सवारी नम्बर उपलब्ध छैन।');
      const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-tqms-pdf-page]'));
      if (elements.length !== pdfPages.length) throw new Error('PDF पृष्ठहरू तयार भएनन्।');
      const blob = await renderPdfPages(elements, {
        orientation: 'portrait',
        copies: 1,
      });
      if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('सवारी नम्बर PDF तयार भएन।');
      const url = URL.createObjectURL(blob);
      downloadDocument(url, 'tqms-unique-vehicle-numbers');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : 'सवारी नम्बर PDF बनाउन सकिएन।');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <section className="space-y-5 pb-8">
      <div
        ref={pdfContentRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-[-10000px] top-0 bg-white text-slate-800"
      >
        {pdfPages.map((pdfPage, pageIndex) => (
          <article
            key={`${pdfPage.duplicates ? 'duplicates' : 'vehicles'}-${pageIndex}`}
            data-tqms-pdf-page=""
            data-pdf-render-root=""
            style={{
              boxSizing: 'border-box',
              width: '794px',
              minHeight: '1123px',
              padding: '48px',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontFamily: '"Noto Sans Devanagari", sans-serif',
              fontSize: '14px',
            }}
          >
            <h1 style={{ margin: '0 0 8px', color: '#14294d', fontSize: '20px' }}>{pdfPage.title}</h1>
            <p style={{ margin: '0 0 16px', color: '#526071' }}>{pdfPage.description}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #dce2e9', padding: '7px 10px', textAlign: 'left', backgroundColor: '#f3f5f8', fontWeight: 600 }}>सवारी नम्बर</th>
                  {pdfPage.duplicates ? <th style={{ borderBottom: '1px solid #dce2e9', padding: '7px 10px', textAlign: 'left', backgroundColor: '#f3f5f8', fontWeight: 600 }}>संख्या</th> : null}
                </tr>
              </thead>
              <tbody>
                {pdfPage.rows.map(({ number, count }) => (
                  <tr key={number}>
                    <td style={{ borderBottom: '1px solid #dce2e9', padding: '7px 10px', textAlign: 'left' }}>{number}</td>
                    {pdfPage.duplicates ? <td style={{ borderBottom: '1px solid #dce2e9', padding: '7px 10px', textAlign: 'left' }}>{toNepaliDigits(count ?? 0)} पटक</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>
      <header>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">TQMS सदस्य सूची</h1>
        <p className="mt-1 text-sm text-muted-foreground">TQMS मा दर्ता भएका सवारीसाधन र धनी विवरण खोज्नुहोस्।</p>
      </header>

      <Card className="space-y-4 rounded-lg border-border/80 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="सवारी नम्बर, धनीको नाम, फोन वा शाखा खोज्नुहोस्"
              aria-label="TQMS सवारी खोज्नुहोस्"
              className="h-10 pl-9"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" className="h-10 gap-2" onClick={() => void reload()} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">ताजा गर्नुहोस्</span>
              <span className="sm:hidden">ताजा</span>
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10 gap-2" onClick={handleDownloadPdf} disabled={filteredVehicles.length === 0 || isDownloadingPdf}>
              <FileDown className="h-4 w-4" aria-hidden="true" />
              {isDownloadingPdf ? 'PDF तयार गर्दैछ…' : 'सवारी नम्बर PDF'}
            </Button>
            <Button type="button" size="sm" className="h-10 gap-2" onClick={() => downloadCsv(filteredVehicles)} disabled={filteredVehicles.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />Excel निकाल्नुहोस्
            </Button>
          </div>
        </div>
        {pdfError ? <p role="alert" className="text-sm text-destructive">{pdfError}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <p aria-live="polite">कुल दर्ता सवारी: <span className="font-semibold text-foreground">{toNepaliDigits(activeVehicles.length)}</span>{debouncedSearch ? ` · खोज नतिजा: ${toNepaliDigits(filteredVehicles.length)}` : ''}</p>
          <p>TQMS शाखा फिल्टर: {branchFilter || 'सबै शाखा'}</p>
        </div>
      </Card>

      {error ? <ErrorState title="TQMS सदस्य सूची लोड गर्न सकिएन" description={error} retryLabel="फेरि प्रयास गर्नुहोस्" onRetry={() => void reload()} /> : null}

      {!error ? (
        <Card className="overflow-hidden rounded-lg border-border/80 shadow-sm">
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(vehicle) => vehicle.id}
            isLoading={isLoading}
            loadingLabel="TQMS सवारी सूची लोड हुँदैछ..."
            ariaLabel="TQMS सदस्य सवारी सूची"
            emptyState={{
              title: debouncedSearch ? 'खोजसँग मिल्ने सवारी भेटिएन' : 'TQMS सवारी भेटिएन',
              description: debouncedSearch ? 'अर्को सवारी नम्बर, धनीको नाम वा फोन खोज्नुहोस्।' : 'TQMS endpoint बाट सवारी सूची खाली आयो।',
            }}
            className="min-w-[850px]"
          />
          <RegistryPagination
            page={currentPage}
            pageSize={pageSize}
            total={filteredVehicles.length}
            onPageChange={setPage}
            onPageSizeChange={changePageSize}
          />
        </Card>
      ) : null}
    </section>
  );
}
