'use client';

import { useMemo, useState } from 'react';
import type { DataTableColumn } from '@/components/data-tables/DataTable';
import { ReportDataTable } from '@/features/reports/components/ReportDataTable';
import { ReportMetric } from '@/features/reports/components/ReportMetric';
import { ReportPageShell } from '@/features/reports/components/ReportPageShell';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { MahasangReportRow } from '@/features/reports/types/summary-reports';
import { formatReportAmount, formatReportDate } from '@/features/reports/utils/report-format';
import { buildMahasangRows } from '@/features/reports/utils/summary-reports';
import { downloadReportCsv, reportHeaderCsvRows } from '@/features/reports/utils/report-csv';
import { toNepaliDigits } from '@/utils/numbers';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import { MahasangReportColumnMenu } from '@/features/reports/components/MahasangReportColumnMenu';
import { useMahasangReportColumns } from '@/features/reports/hooks/use-mahasang-report-columns';
import {
  MAHASANG_REPORT_COLUMN_OPTIONS,
  type MahasangReportColumnId,
} from '@/features/reports/utils/mahasang-report-columns';

function columnValue(row: MahasangReportRow, key: keyof MahasangReportRow): string | number {
  if (key === 'ownerName') {
    return getMemberOwnerDisplayLines(row.ownerName, row.operatorName)
      .map((line) => `${line.label}${line.label ? ' ' : ''}${line.name}${line.suffix}`)
      .join(' / ');
  }
  if (['membershipIncome', 'otherIncome', 'total'].includes(key)) {
    return formatReportAmount(Number(row[key]));
  }
  if (key === 'periodMonths') return toNepaliDigits(row.periodMonths);
  if (['billingDate', 'periodStart', 'periodEnd'].includes(key)) return formatReportDate(String(row[key]));
  return String(row[key]);
}

export function MahasangReportPage() {
  const { records, isLoading, error } = useReceipts();
  const [includeHeader, setIncludeHeader] = useState(false);
  const header = useReportHeaderDetails('महासंघ रिपोर्ट');
  const { visibleColumns, applyColumns } = useMahasangReportColumns();
  const rows = useMemo(() => buildMahasangRows(records), [records]);
  const totalMembership = useMemo(() => rows.reduce((sum, row) => sum + row.membershipIncome, 0), [rows]);
  const totalOther = useMemo(() => rows.reduce((sum, row) => sum + row.otherIncome, 0), [rows]);
  const allColumns: Record<MahasangReportColumnId, DataTableColumn<MahasangReportRow>> = {
    vehicleNumber: { id: 'vehicleNumber', header: 'गाडी नं.', cell: (row) => row.vehicleNumber },
    previousVehicleNumber: { id: 'previousVehicleNumber', header: 'पुरानो गाडी नं.', cell: (row) => row.previousVehicleNumber },
    vehicleType: { id: 'vehicleType', header: 'सवारी प्रकार', cell: (row) => row.vehicleType },
    ownerName: {
      id: 'ownerName',
      header: 'धनीको नाम',
      cell: (row) => (
        <div className="space-y-0.5">
          {getMemberOwnerDisplayLines(row.ownerName, row.operatorName).map((line) => (
            <p key={`${line.label}-${line.name}`} className="text-xs">
              {line.label ? <span className="text-muted-foreground">{line.label}</span> : null}
              {line.label ? ' ' : ''}<span className="font-medium">{line.name}{line.suffix}</span>
            </p>
          ))}
        </div>
      ),
    },
    ownerPhone: { id: 'ownerPhone', header: 'धनीको फोन', cell: (row) => row.ownerPhone },
    note: { id: 'note', header: 'कैफियत', cell: (row) => row.note },
    receiptNumber: { id: 'receiptNumber', header: 'रसिद नं.', cell: (row) => toNepaliDigits(row.receiptNumber) },
    membershipIncome: { id: 'membershipIncome', header: 'सदस्यताबाट', cell: (row) => formatReportAmount(row.membershipIncome) },
    otherIncome: { id: 'otherIncome', header: 'अन्य आम्दानी', cell: (row) => formatReportAmount(row.otherIncome) },
    total: { id: 'total', header: 'जम्मा', cell: (row) => formatReportAmount(row.total) },
    periodMonths: { id: 'periodMonths', header: 'अवधि महिना', cell: (row) => toNepaliDigits(row.periodMonths) },
    paymentMethod: { id: 'paymentMethod', header: 'भुक्तानी तरिका', cell: (row) => row.paymentMethod },
    billingDate: { id: 'billingDate', header: 'का. मिति', cell: (row) => formatReportDate(row.billingDate) },
    periodStart: { id: 'periodStart', header: 'देखि', cell: (row) => formatReportDate(row.periodStart) },
    periodEnd: { id: 'periodEnd', header: 'सम्म', cell: (row) => formatReportDate(row.periodEnd) },
  };
  const columns = visibleColumns.map((id) => allColumns[id]);
  const exportLabels = Object.fromEntries(
    MAHASANG_REPORT_COLUMN_OPTIONS.map((column) => [column.id, column.label]),
  ) as Record<MahasangReportColumnId, string>;

  const exportRows = rows.map((row, index) => ({ ...row, serialNumber: toNepaliDigits(index + 1) }));
  const exportCsv = () => downloadReportCsv(
    exportRows,
    [
      { label: 'सि.नं.', value: (row) => row.serialNumber },
      ...visibleColumns.map((key) => ({
        label: exportLabels[key],
        value: (row: typeof exportRows[number]) => columnValue(row, key),
      })),
    ],
    'mahasang-report',
    includeHeader ? reportHeaderCsvRows(header.details) : [],
  );

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="महासंघ रिपोर्ट"
        description="सवारी बिलका कारोबार, धनी/सञ्चालक विवरण र आम्दानी हेर्नुहोस्। उपलब्ध स्तम्भ छानेर तालिका र CSV निर्यात अनुकूलन गर्नुहोस्।"
        details={header.details}
        detailsError={header.error}
        includeHeaderDetails={includeHeader}
        onIncludeHeaderDetailsChange={setIncludeHeader}
        onExportCsv={exportCsv}
        exportDisabled={isLoading || Boolean(error) || rows.length === 0}
      />
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">रिपोर्ट लोड गर्न सकिएन: {error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label="सवारी बिल" value={toNepaliDigits(rows.length)} description="BillResource बाट समेटिएका बिल" />
        <ReportMetric label="सदस्यताबाट" value={`रु ${formatReportAmount(totalMembership)}`} description="भुक्तानी भएका सवारी बिलको जम्मा" />
        <ReportMetric label="अन्य आम्दानी" value={`रु ${formatReportAmount(totalOther)}`} description="सामान्य बिलिङ सुविधा उपलब्ध भएपछि गणना हुनेछ" />
      </div>
      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">महासंघ कारोबार विवरण</h2>
            <p className="mt-1 text-xs text-muted-foreground">सि.नं. सधैँ देखिन्छ। पुरानो गाडी नम्बर हालको BillResource मा उपलब्ध नभएकाले — देखाइएको छ।</p>
          </div>
          <MahasangReportColumnMenu visibleColumns={visibleColumns} onApply={applyColumns} />
        </div>
        <ReportDataTable
          rows={rows}
          columns={columns}
          searchableText={(row) => `${row.vehicleNumber} ${row.previousVehicleNumber} ${row.ownerName} ${row.operatorName} ${row.ownerPhone} ${row.receiptNumber} ${row.vehicleType} ${row.note}`}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          loadingLabel="महासंघ रिपोर्ट लोड हुँदैछ..."
          emptyTitle="कारोबार भेटिएन"
          emptyDescription="BillResource मा कुनै कारोबार उपलब्ध छैन।"
        />
      </section>
    </section>
  );
}
