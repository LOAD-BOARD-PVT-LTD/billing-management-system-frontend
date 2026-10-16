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

function columnValue(row: MahasangReportRow, key: keyof MahasangReportRow): string | number {
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
  const rows = useMemo(() => buildMahasangRows(records), [records]);
  const totalMembership = useMemo(() => rows.reduce((sum, row) => sum + row.membershipIncome, 0), [rows]);
  const totalOther = useMemo(() => rows.reduce((sum, row) => sum + row.otherIncome, 0), [rows]);
  const columns: DataTableColumn<MahasangReportRow>[] = [
    { id: 'vehicleNumber', header: 'गाडी नं.', cell: (row) => toNepaliDigits(row.vehicleNumber) },
    { id: 'previousVehicleNumber', header: 'पुरानो गाडी नं.', cell: (row) => row.previousVehicleNumber },
    { id: 'vehicleType', header: 'सवारी प्रकार', cell: (row) => row.vehicleType },
    { id: 'ownerName', header: 'धनीको नाम', cell: (row) => row.ownerName },
    { id: 'note', header: 'कैफियत', cell: (row) => row.note },
    { id: 'receiptNumber', header: 'रसिद नं.', cell: (row) => toNepaliDigits(row.receiptNumber) },
    { id: 'membershipIncome', header: 'सदस्यताबाट', cell: (row) => formatReportAmount(row.membershipIncome) },
    { id: 'otherIncome', header: 'अन्य आम्दानी', cell: (row) => formatReportAmount(row.otherIncome) },
    { id: 'total', header: 'जम्मा', cell: (row) => formatReportAmount(row.total) },
    { id: 'periodMonths', header: 'अवधि महिना', cell: (row) => toNepaliDigits(row.periodMonths) },
    { id: 'paymentMethod', header: 'भुक्तानी तरिका', cell: (row) => row.paymentMethod },
    { id: 'billingDate', header: 'का. मिति', cell: (row) => formatReportDate(row.billingDate) },
    { id: 'periodStart', header: 'देखि', cell: (row) => formatReportDate(row.periodStart) },
    { id: 'periodEnd', header: 'सम्म', cell: (row) => formatReportDate(row.periodEnd) },
  ];
  const exportColumns = [
    ['vehicleNumber', 'गाडी नं.'],
    ['previousVehicleNumber', 'पुरानो गाडी नं.'],
    ['vehicleType', 'सवारी प्रकार'],
    ['ownerName', 'धनीको नाम'],
    ['note', 'कैफियत'],
    ['receiptNumber', 'रसिद नं.'],
    ['membershipIncome', 'सदस्यताबाट'],
    ['otherIncome', 'अन्य आम्दानी'],
    ['total', 'जम्मा'],
    ['periodMonths', 'अवधि महिना'],
    ['paymentMethod', 'भुक्तानी तरिका'],
    ['billingDate', 'का. मिति'],
    ['periodStart', 'देखि'],
    ['periodEnd', 'सम्म'],
  ] as const;

  const exportCsv = () => downloadReportCsv(
    rows,
    exportColumns.map(([key, label]) => ({
      label,
      value: (row) => columnValue(row, key),
    })),
    'mahasang-report',
    includeHeader ? reportHeaderCsvRows(header.details) : [],
  );

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="महासंघ रिपोर्ट"
        description="सवारी बिलका कारोबार र सदस्यता आम्दानीको विवरण। पुरानो सवारी नम्बर BillResource मा नभएकाले उपलब्ध छैन।"
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
        <h2 className="mb-3 text-base font-semibold">महासंघ कारोबार विवरण</h2>
        <ReportDataTable
          rows={rows}
          columns={columns}
          searchableText={(row) => `${row.vehicleNumber} ${row.ownerName} ${row.receiptNumber} ${row.vehicleType} ${row.note}`}
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
