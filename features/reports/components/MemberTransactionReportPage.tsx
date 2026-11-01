'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Columns3, Download, FileDown, Search } from 'lucide-react';
import type { DataTableColumn } from '@/components/data-tables/DataTable';
import { DataTable, type DataTableColumn as DataTableColumnType } from '@/components/data-tables/DataTable';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import { useMembers } from '@/features/members/hooks/use-members';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import { calculateMembers } from '@/features/members/utils/member-calculations';
import { useTqmsVehicleDetails } from '@/features/billing/hooks/useTqmsVehicleDetails';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { MemberTransactionRow } from '@/features/reports/types/summary-reports';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';
import { buildMemberTransactionCandidates, searchMemberTransactionCandidates } from '@/features/reports/utils/member-transaction-report';
import { formatReportAmount, formatReportDate, normalizeReportKey } from '@/features/reports/utils/report-format';
import { downloadReportCsv, reportHeaderCsvRows } from '@/features/reports/utils/report-csv';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { useTqmsMemberRegistry } from '@/features/vehicle/tqms/hooks/useTqmsMemberRegistry';
import { toEnglishDigits, toNepaliDigits } from '@/utils/numbers';

const PAGE_SIZE = 100;

const REPORT_COLUMNS = [
  { id: 'date', label: 'मिति', defaultVisible: true },
  { id: 'periodEnd', label: 'मिति सम्म', defaultVisible: true },
  { id: 'receiptNumber', label: 'रसिद नं.', defaultVisible: true },
  { id: 'details', label: 'कैफियत', defaultVisible: true },
  { id: 'amount', label: 'रकम रु.', defaultVisible: true },
  { id: 'extra', label: 'जम्मा मध्ये अतिरिक्त', defaultVisible: true },
] as const;

type ReportColumnId = (typeof REPORT_COLUMNS)[number]['id'];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function formatComplianceDate(
  startBs?: string | number | null,
  startAd?: string | number | null,
  expiryBs?: string | number | null,
  expiryAd?: string | number | null,
): string {
  const start = startBs ? toNepaliDigits(String(startBs).replaceAll('-', '/'))
    : startAd ? formatReportDate(String(startAd)) : '';
  const expiry = expiryBs ? toNepaliDigits(String(expiryBs).replaceAll('-', '/'))
    : expiryAd ? formatReportDate(String(expiryAd)) : '';
  return start && expiry ? `${start} - ${expiry}` : start || expiry || '—';
}

function getExtraAmount(row: MemberTransactionRow): number {
  const billItemAmount = row.receipt.bill.content.items.reduce((total, item) => total + item.amount, 0);
  return Math.max(0, row.receipt.totalAmount - billItemAmount);
}

function openMemberReportPrintView(
  rows: MemberTransactionRow[],
  headerDetails: ReportHeaderDetails,
  profile: Array<[string, string]>,
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${toNepaliDigits(index + 1)}</td>
      <td>${escapeHtml(formatReportDate(row.receipt.paymentDate))}</td>
      <td>${escapeHtml(formatReportDate(row.receipt.validUntil))}</td>
      <td>${escapeHtml(toNepaliDigits(row.receipt.receiptNumber))}</td>
      <td>${escapeHtml(row.receipt.bill.content.note || row.feeTitles)}</td>
      <td class="amount">${escapeHtml(formatReportAmount(row.receipt.totalAmount))}</td>
      <td class="amount">${escapeHtml(formatReportAmount(getExtraAmount(row)))}</td>
    </tr>`).join('');
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="ne">
      <head>
        <meta charset="utf-8">
        <title>सदस्यता तथा कारोबार रिपोर्ट</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { color: #111827; font: 13px system-ui, sans-serif; }
          h1 { margin: 0 0 4px; text-align: center; font-size: 20px; }
          .template { margin-bottom: 18px; text-align: center; }
          .template p { margin: 2px 0; }
          .profile { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 24px; margin-bottom: 18px; }
          .profile p { margin: 0; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 7px 6px; border: 1px solid #d1d5db; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .amount { text-align: right; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div class="template">
          <h1>${escapeHtml(headerDetails.organizationName || '—')}</h1>
          <p>${escapeHtml(headerDetails.officeAddress || '—')}</p>
          <p>${escapeHtml(headerDetails.branchName || '—')}</p>
          <p>${escapeHtml(headerDetails.reportTitle)} (${escapeHtml(headerDetails.reportDateRange)})</p>
          <p>मिति: ${escapeHtml(headerDetails.reportDateLine)}</p>
        </div>
        <div class="profile">
          ${profile.map(([label, value]) => `<p>${escapeHtml(label)}: ${escapeHtml(value || '—')}</p>`).join('')}
        </div>
        <table>
          <thead><tr><th>सि.नं.</th><th>मिति</th><th>मिति सम्म</th><th>रसिद नं.</th><th>कैफियत</th><th>रकम रु.</th><th>जम्मा मध्ये अतिरिक्त</th></tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="7">कारोबार विवरण भेटिएन।</td></tr>'}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 250);
  return true;
}

export function MemberTransactionReportPage() {
  const { records, isLoading, error } = useReceipts();
  const { vehicles: registryVehicles, error: registryError } = useTqmsMemberRegistry();
  const { fiscalYears, error: fiscalYearsError } = useFiscalYearManagement();
  const { memberResources, error: memberResourcesError } = useMembers();
  const { records: blacklistedVehicles, error: blacklistError } = useVehicleBlacklist();
  const { vehicles: memberVehicles, error: memberVehiclesError } = useMemberVehicles();
  const { records: vehicleTypeRecords, loadError: vehicleTypesError } = useVehicleTypes();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<ReportColumnId[]>(
    REPORT_COLUMNS.filter((column) => column.defaultVisible).map((column) => column.id),
  );
  const [page, setPage] = useState(1);
  const header = useReportHeaderDetails('सदस्यता तथा कारोबार रिपोर्ट');

  const activeFiscalYearId = fiscalYears.find((year) => year.status === 'ACTIVE')?.id ?? '';
  const memberDetails = useMemo(
    () => calculateMembers(records, fiscalYears, activeFiscalYearId, memberResources, blacklistedVehicles).records,
    [records, fiscalYears, activeFiscalYearId, memberResources, blacklistedVehicles],
  );
  const candidates = useMemo(
    () => buildMemberTransactionCandidates(records, registryVehicles, memberDetails),
    [records, registryVehicles, memberDetails],
  );
  const matchingCandidates = useMemo(
    () => searchMemberTransactionCandidates(candidates, submittedSearch),
    [candidates, submittedSearch],
  );
  const selectedCandidate = matchingCandidates.find((candidate) => candidate.id === selectedCandidateId);
  const selectedRows = selectedCandidate?.transactions ?? [];
  const { details: tqmsVehicle, error: tqmsVehicleError } = useTqmsVehicleDetails(selectedCandidate?.vehicleNumber ?? '');
  const selectedVehicle = selectedCandidate
    ? memberVehicles.find((vehicle) =>
      normalizeReportKey(toEnglishDigits(vehicle.vehicleNumber)) === normalizeReportKey(selectedCandidate.vehicleNumber),
    )
    : undefined;
  const selectedMember = selectedCandidate
    ? memberDetails.find((member) =>
      normalizeReportKey(toEnglishDigits(member.vehicleNumber)) === normalizeReportKey(selectedCandidate.vehicleNumber),
    )
    : undefined;
  const vehicleCategory = vehicleTypeRecords.find((record) =>
    record.vehicleTypes.includes(selectedVehicle?.tqmsVehicleTypeId ?? '')
      || record.vehicleTypes.includes(selectedVehicle?.tqmsVehicleType ?? selectedCandidate?.vehicleType ?? ''),
  )?.category ?? '';
  const insurance = tqmsVehicle?.Compliance?.Insurance;
  const checkPass = tqmsVehicle?.Compliance?.CheckPass;
  const bluebook = tqmsVehicle?.Compliance?.Bluebook ?? tqmsVehicle?.Compliance?.BlueBook
    ?? tqmsVehicle?.Bluebook ?? tqmsVehicle?.BlueBook;
  const latestReceipt = [...selectedRows].sort((a, b) =>
    b.receipt.paymentDate.localeCompare(a.receipt.paymentDate),
  )[0]?.receipt;
  const selectedProfile: Array<[string, string]> = selectedCandidate ? [
    ['सवारी नं.', toEnglishDigits(selectedVehicle?.vehicleNumber || selectedCandidate.vehicleNumber)],
    ['सदस्य नं.', selectedCandidate.memberNumber],
    ['धनीको नाम', selectedVehicle?.sawariDhaniName || selectedCandidate.ownerName],
    ['सञ्चालकको नाम', selectedVehicle?.sanchalakName || ''],
    ['सम्पर्क नं.', toEnglishDigits(selectedVehicle?.phone || selectedCandidate.phone)],
    ['ठेगाना', selectedVehicle?.address || selectedCandidate.address],
    ['सवारी वर्ग', vehicleCategory],
    ['सवारी प्रकार', selectedVehicle?.tqmsVehicleType || selectedCandidate.vehicleType],
    ['बीमा नं.', insurance?.PolicyNumber ?? ''],
    ['बीमा कम्पनी', insurance?.Company ?? ''],
    ['बीमा मिति', formatComplianceDate(insurance?.StartBs, insurance?.StartAd, insurance?.ExpiryBs, insurance?.ExpiryAd)],
    ['चेकपास मिति', formatComplianceDate(checkPass?.StartBs, checkPass?.StartAd, checkPass?.ExpiryBs, checkPass?.ExpiryAd)],
    ['ब्लुबुक मिति', formatComplianceDate(bluebook?.StartBs, bluebook?.StartAd, bluebook?.ExpiryBs, bluebook?.ExpiryAd)],
    ['जारी मिति', selectedMember?.billingDate ? formatReportDate(selectedMember.billingDate) : ''],
    ['सुरु मिति', selectedMember?.periodStart ? formatReportDate(selectedMember.periodStart) : ''],
    ['प्रिन्ट मिति', latestReceipt?.lastPrintedAt ? formatReportDate(latestReceipt.lastPrintedAt) : ''],
    ['सदस्यता मिति', selectedMember?.expiryDate ? formatReportDate(selectedMember.expiryDate) : ''],
    ['कारोबार संख्या', toNepaliDigits(selectedRows.length)],
  ] : [];
  const pageCount = Math.max(1, Math.ceil(selectedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = selectedRows
    .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    .map((row, index) => ({ ...row, displayNumber: (currentPage - 1) * PAGE_SIZE + index + 1 }));
  const totalPaid = selectedRows.reduce(
    (total, row) => total + (row.receipt.status === 'PAID' ? row.receipt.totalAmount : 0),
    0,
  );

  const columns = useMemo<DataTableColumn<MemberTransactionRow>[]>(() => {
    const allColumns: Record<ReportColumnId, DataTableColumnType<MemberTransactionRow>> = {
      date: { id: 'date', header: 'मिति', cell: (row) => formatReportDate(row.receipt.paymentDate) },
      periodEnd: { id: 'periodEnd', header: 'मिति सम्म', cell: (row) => formatReportDate(row.receipt.validUntil) },
      receiptNumber: { id: 'receiptNumber', header: 'रसिद नं.', cell: (row) => toNepaliDigits(row.receipt.receiptNumber) },
      details: { id: 'details', header: 'कैफियत', cell: (row) => row.receipt.bill.content.note || row.feeTitles },
      amount: { id: 'amount', header: <div className="text-right">रकम रु.</div>, cell: (row) => <div className="text-right tabular-nums">{formatReportAmount(row.receipt.totalAmount)}</div>, cellClassName: 'text-right' },
      extra: { id: 'extra', header: <div className="text-right">जम्मा मध्ये अतिरिक्त</div>, cell: (row) => <div className="text-right tabular-nums">{formatReportAmount(getExtraAmount(row))}</div>, cellClassName: 'text-right' },
    };
    return [
      { id: 'serial', header: 'सि.नं.', cell: (row) => toNepaliDigits(row.displayNumber ?? 0), headerClassName: 'w-16' },
      ...visibleColumns.map((column) => allColumns[column]),
    ];
  }, [visibleColumns]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSearch = search.trim();
    setSubmittedSearch(nextSearch);
    setSelectedCandidateId('');
    setPage(1);
  };

  const exportCsv = () => {
    if (!selectedCandidate) return;
    downloadReportCsv(
      selectedRows,
      [
        ...selectedProfile.map(([label, value]) => ({ label, value: () => value || '—' })),
        { label: 'मिति', value: (row) => formatReportDate(row.receipt.paymentDate) },
        { label: 'मिति सम्म', value: (row) => formatReportDate(row.receipt.validUntil) },
        { label: 'रसिद नं.', value: (row) => row.receipt.receiptNumber },
        { label: 'कैफियत', value: (row) => row.receipt.bill.content.note || row.feeTitles },
        { label: 'रकम रु.', value: (row) => row.receipt.totalAmount },
        { label: 'जम्मा मध्ये अतिरिक्त', value: (row) => getExtraAmount(row) },
      ],
      `membership-transaction-${selectedCandidate.vehicleNumber.replace(/[^\p{L}\p{N}-]/gu, '-')}`,
      reportHeaderCsvRows(header.details),
    );
  };

  const exportPdf = () => {
    if (!selectedCandidate) return;
    if (!openMemberReportPrintView(selectedRows, header.details, selectedProfile)) {
      toast({
        title: 'PDF निर्यात सुरु गर्न सकिएन',
        description: 'ब्राउजरमा नयाँ विन्डो खोल्ने अनुमति दिनुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-4 pb-8">
      <section className="space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="सवारी नम्बर, धनीको नाम, फोन नम्बर, वा सदस्य नम्बर खोज्नुहोस्"
              aria-label="सवारी नम्बर, धनीको नाम, फोन नम्बर, वा सदस्य नम्बर खोज्नुहोस्"
              className="h-10 pl-9"
            />
          </div>
          <Button type="submit" className="h-10 gap-2" disabled={!search.trim() || isLoading}>
            <Search className="h-4 w-4" aria-hidden="true" />खोज्नुहोस्
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2" onClick={exportCsv} disabled={!selectedCandidate || selectedRows.length === 0}>
            <Download className="h-4 w-4" aria-hidden="true" />Excel निकाल्नुहोस्
          </Button>
          <Button type="button" variant="outline" className="h-10 gap-2" onClick={exportPdf} disabled={!selectedCandidate || selectedRows.length === 0}>
            <FileDown className="h-4 w-4" aria-hidden="true" />PDF निकाल्नुहोस्
          </Button>
        </form>
        <div className="flex justify-end border-t border-border pt-3">
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {isLoading ? 'कारोबार लोड हुँदैछ...' : error ? 'कारोबार उपलब्ध छैन' : ''}
          </span>
        </div>
      </section>

      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">कारोबार इतिहास लोड गर्न सकिएन: {error}</p> : null}
      {(registryError || fiscalYearsError || memberResourcesError || blacklistError || memberVehiclesError || vehicleTypesError) ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          थप सदस्य/सवारी विवरण लोड भएन; उपलब्ध कारोबार विवरणबाट खोजी जारी छ।
        </p>
      ) : null}

      {submittedSearch ? (
        <section className="space-y-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">सदस्य छान्नुहोस्</h2>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              खोज परिणाम: {toNepaliDigits(matchingCandidates.length)}
            </p>
          </div>
          {isLoading ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">कारोबार खोज्दैछ...</p>
          ) : matchingCandidates.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {matchingCandidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  onClick={() => { setSelectedCandidateId(candidate.id); setPage(1); }}
                  aria-pressed={candidate.id === selectedCandidateId}
                  className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${candidate.id === selectedCandidateId ? 'border-primary bg-primary/[0.05]' : 'border-border'}`}
                >
                  <span className="block font-semibold text-foreground">{candidate.vehicleNumber}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                    {candidate.ownerName || '—'}{candidate.phone ? ` | ${candidate.phone}` : ''}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              “{submittedSearch}” का लागि सदस्य वा कारोबार भेटिएन। सवारी नम्बर, धनीको नाम, फोन नम्बर वा सदस्य नम्बर फेरि जाँच्नुहोस्।
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
          <h2 className="font-semibold text-foreground">सदस्य खोज्नुहोस्</h2>
          <p className="mt-1 text-sm text-muted-foreground">सदस्यता तथा कारोबार रिपोर्ट हेर्न सवारी नम्बर, धनीको नाम, फोन नम्बर वा सदस्य नम्बर खोज्नुहोस्।</p>
        </section>
      )}

      <section className="rounded-xl border border-border/80 bg-card px-5 py-4 text-center shadow-sm sm:px-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">{header.details.organizationName || '—'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{header.details.officeAddress || '—'}</p>
        <p className="text-sm text-muted-foreground">शाखा: {header.details.branchName || '—'}</p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">{header.details.reportTitle}</h2>
        <p className="text-sm text-muted-foreground">{header.details.reportDateRange} | मिति: {header.details.reportDateLine}</p>
      </section>

      {selectedCandidate ? (
        <section className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
          <div className="grid gap-x-6 gap-y-2 rounded-lg border border-border/70 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {selectedProfile.map(([label, value]) => (
              <p key={label}><span className="text-muted-foreground">{label}:</span> <strong>{value || '—'}</strong></p>
            ))}
          </div>
          {tqmsVehicleError ? <p role="status" className="text-xs text-amber-700">TQMS का बीमा तथा अनुपालन विवरण लोड भएन: {tqmsVehicleError}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">कारोबार इतिहास</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">{toNepaliDigits(selectedRows.length)} कारोबार</span>
              <span className="font-semibold">भुक्तानी भएको जम्मा रु. {formatReportAmount(totalPaid)}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    <Columns3 className="h-4 w-4" aria-hidden="true" />Columns
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 space-y-2">
                  <p className="text-sm font-semibold">कुन column देखाउने?</p>
                  {REPORT_COLUMNS.map((column) => (
                    <label key={column.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={visibleColumns.includes(column.id)}
                        onCheckedChange={(checked) => setVisibleColumns((current) => checked === true
                          ? [...current, column.id]
                          : current.filter((value) => value !== column.id))}
                      />
                      {column.label}
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border border-border/80">
            <DataTable
              columns={columns}
              data={pageRows}
              getRowId={(row) => row.id}
              isLoading={isLoading}
              loadingLabel="सदस्य कारोबार इतिहास लोड हुँदैछ..."
              emptyState={{ title: 'कारोबार इतिहास भेटिएन', description: 'यस सदस्यका लागि BillResource कारोबार उपलब्ध छैन।' }}
              className="min-w-[760px]"
            />
          </div>
          <p className="text-right text-sm font-semibold">जम्मा मध्ये अतिरिक्त रु. {formatReportAmount(selectedRows.reduce((total, row) => total + getExtraAmount(row), 0))}</p>
          <DataTablePagination page={currentPage} pageSize={PAGE_SIZE} total={selectedRows.length} onPageChange={setPage} />
        </section>
      ) : null}
    </section>
  );
}
