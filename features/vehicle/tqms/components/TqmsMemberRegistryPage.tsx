'use client';

import 'regenerator-runtime/runtime';
import { useEffect, useMemo, useState } from 'react';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
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


const PAGE_SIZE_OPTIONS = [25, 50, 100];
const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 42;
const DEVANAGARI_SCRIPT = /\p{Script=Devanagari}/u;

type VehicleNumberFonts = {
  devanagari: PDFFont;
  latin: PDFFont;
};

async function fetchPdfFont(path: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`सवारी नम्बर PDF फन्ट लोड गर्न सकिएन (${response.status})।`);
  return new Uint8Array(await response.arrayBuffer());
}

function drawVehicleNumber(
  page: PDFPage,
  value: string,
  x: number,
  top: number,
  fonts: VehicleNumberFonts,
): void {
  const size = 12;
  let cursorX = x;
  let segment = '';
  let segmentIsDevanagari: boolean | null = null;

  const drawSegment = () => {
    if (!segment || segmentIsDevanagari === null) return;
    const font = segmentIsDevanagari ? fonts.devanagari : fonts.latin;
    page.drawText(segment, {
      x: cursorX,
      y: page.getHeight() - top - size,
      size,
      font,
      color: rgb(0.12, 0.16, 0.22),
    });
    cursorX += font.widthOfTextAtSize(segment, size);
  };

  for (const character of value) {
    const isDevanagari = DEVANAGARI_SCRIPT.test(character);
    if (segmentIsDevanagari !== null && isDevanagari !== segmentIsDevanagari) {
      drawSegment();
      segment = '';
    }
    segment += character;
    segmentIsDevanagari = isDevanagari;
  }
  drawSegment();
}

async function downloadUniqueVehicleNumbersPdf(rows: TqmsRegistryVehicle[]): Promise<void> {
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
  const uniqueNumbers = groupedNumbers.map(({ number }) => number);
  const duplicateNumbers = groupedNumbers.filter(({ count }) => count > 1);

  if (uniqueNumbers.length === 0) throw new Error('डाउनलोड गर्न सवारी नम्बर उपलब्ध छैन।');

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [devanagariFontBytes, latinFontBytes] = await Promise.all([
    fetchPdfFont('/fonts/noto-sans-devanagari-devanagari-400-normal.woff'),
    fetchPdfFont('/fonts/noto-sans-devanagari-latin-400-normal.woff'),
  ]);
  const fonts = {
    devanagari: await pdf.embedFont(devanagariFontBytes, { subset: true }),
    latin: await pdf.embedFont(latinFontBytes, { subset: true }),
  };

  const title = 'सवारी नम्बर';
  const titleSize = 16;
  const totalLabel = `जम्मा अद्वितीय सवारी: ${toNepaliDigits(uniqueNumbers.length)}`;
  const titleHeight = 48;
  const rowHeight = 24;
  const rowsPerPage = Math.floor((PDF_PAGE_HEIGHT - PDF_MARGIN * 2 - titleHeight) / rowHeight);

  for (let start = 0; start < uniqueNumbers.length; start += rowsPerPage) {
    const page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    page.drawText(title, {
      x: PDF_MARGIN,
      y: PDF_PAGE_HEIGHT - PDF_MARGIN - titleSize,
      size: titleSize,
      font: fonts.devanagari,
      color: rgb(0.08, 0.16, 0.3),
    });
    page.drawText(totalLabel, {
      x: PDF_MARGIN,
      y: PDF_PAGE_HEIGHT - PDF_MARGIN - titleSize - 18,
      size: 11,
      font: fonts.devanagari,
      color: rgb(0.32, 0.38, 0.46),
    });

    const pageNumbers = uniqueNumbers.slice(start, start + rowsPerPage);
    pageNumbers.forEach((number, index) => {
      const top = PDF_MARGIN + titleHeight + index * rowHeight;
      drawVehicleNumber(page, number, PDF_MARGIN, top, fonts);
      page.drawLine({
        start: { x: PDF_MARGIN, y: PDF_PAGE_HEIGHT - top - rowHeight + 5 },
        end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: PDF_PAGE_HEIGHT - top - rowHeight + 5 },
        thickness: 0.4,
        color: rgb(0.86, 0.89, 0.93),
      });
    });
  }

  if (duplicateNumbers.length > 0) {
    const duplicateTitle = 'दोहोरो सवारी नम्बर';
    const duplicateTotalLabel = `दोहोरो नम्बर भएका सवारी: ${toNepaliDigits(duplicateNumbers.length)}`;
    for (let start = 0; start < duplicateNumbers.length; start += rowsPerPage) {
      const page = pdf.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
      page.drawText(duplicateTitle, {
        x: PDF_MARGIN,
        y: PDF_PAGE_HEIGHT - PDF_MARGIN - titleSize,
        size: titleSize,
        font: fonts.devanagari,
        color: rgb(0.08, 0.16, 0.3),
      });
      page.drawText(duplicateTotalLabel, {
        x: PDF_MARGIN,
        y: PDF_PAGE_HEIGHT - PDF_MARGIN - titleSize - 18,
        size: 11,
        font: fonts.devanagari,
        color: rgb(0.32, 0.38, 0.46),
      });

      duplicateNumbers.slice(start, start + rowsPerPage).forEach(({ number, count }, index) => {
        const top = PDF_MARGIN + titleHeight + index * rowHeight;
        drawVehicleNumber(page, `${number} — ${toNepaliDigits(count)} पटक`, PDF_MARGIN, top, fonts);
        page.drawLine({
          start: { x: PDF_MARGIN, y: PDF_PAGE_HEIGHT - top - rowHeight + 5 },
          end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: PDF_PAGE_HEIGHT - top - rowHeight + 5 },
          thickness: 0.4,
          color: rgb(0.86, 0.89, 0.93),
        });
      });
    }
  }

  const bytes = await pdf.save();
  const blobBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBuffer).set(bytes);
  const url = URL.createObjectURL(new Blob([blobBuffer], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tqms-unique-vehicle-numbers.pdf';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  const { vehicles, isLoading, isRefreshing, error, reload } = useTqmsMemberRegistry();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
      await downloadUniqueVehicleNumbersPdf(filteredVehicles);
    } catch (cause) {
      setPdfError(cause instanceof Error ? cause.message : 'सवारी नम्बर PDF बनाउन सकिएन।');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <section className="space-y-5 pb-8">
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
              {isDownloadingPdf ? 'PDF बनाउँदैछ…' : 'सवारी नम्बर PDF'}
            </Button>
            <Button type="button" size="sm" className="h-10 gap-2" onClick={() => downloadCsv(filteredVehicles)} disabled={filteredVehicles.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />Excel निकाल्नुहोस्
            </Button>
          </div>
        </div>
        {pdfError ? <p role="alert" className="text-sm text-destructive">{pdfError}</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <p aria-live="polite">कुल दर्ता सवारी: <span className="font-semibold text-foreground">{toNepaliDigits(activeVehicles.length)}</span>{debouncedSearch ? ` · खोज नतिजा: ${toNepaliDigits(filteredVehicles.length)}` : ''}</p>
          <p>TQMS शाखा फिल्टर: Narayani Sangh Hetauda</p>
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