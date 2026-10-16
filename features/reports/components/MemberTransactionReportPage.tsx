'use client';

import { useMemo, useState } from 'react';
import type { DataTableColumn } from '@/components/data-tables/DataTable';
import { ReportDataTable } from '@/features/reports/components/ReportDataTable';
import { ReportMetric } from '@/features/reports/components/ReportMetric';
import { ReportPageShell } from '@/features/reports/components/ReportPageShell';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import type { MemberTransactionRow } from '@/features/reports/types/summary-reports';
import { formatReportAmount, formatReportDate, normalizeReportKey } from '@/features/reports/utils/report-format';
import { downloadReportCsv, reportHeaderCsvRows } from '@/features/reports/utils/report-csv';
import { useTqmsMemberRegistry } from '@/features/vehicle/tqms/hooks/useTqmsMemberRegistry';
import { toNepaliDigits } from '@/utils/numbers';

export function MemberTransactionReportPage() {
  const { records, isLoading, error } = useReceipts();
  const { vehicles: registryVehicles, error: registryError } = useTqmsMemberRegistry();
  const [includeHeader, setIncludeHeader] = useState(false);
  const header = useReportHeaderDetails('सदस्यता तथा कारोबार रिपोर्ट');
  const rows = useMemo<MemberTransactionRow[]>(() => records.map((receipt) => ({
    id: receipt.id,
    receipt,
    feeTitles: receipt.bill.content.items.map((item) => item.title).filter(Boolean).join(', ') || '—',
    phone: receipt.bill.content.vehicle.phone || '—',
    memberNumber: '—',
    previousVehicleNumber: '—',
  })), [records]);
  const registryByVehicle = useMemo(() => new Map(
    registryVehicles.map((vehicle) => [normalizeReportKey(vehicle.vehicleNumber), vehicle]),
  ), [registryVehicles]);
  const totalPaid = useMemo(() => {
    const paidReceipts = new Map(records.filter((receipt) => receipt.status === 'PAID').map((receipt) => [receipt.id, receipt.totalAmount]));
    return Array.from(paidReceipts.values()).reduce((sum, amount) => sum + amount, 0);
  }, [records]);
  const searchableText = (row: MemberTransactionRow) => {
    const vehicle = normalizeReportKey(row.receipt.vehicleNumber);
    const registry = registryByVehicle.get(vehicle);
    return [
      row.receipt.vehicleNumber,
      row.previousVehicleNumber,
      row.receipt.customerName,
      row.phone,
      row.memberNumber,
      row.receipt.receiptNumber,
      row.receipt.branchName,
      row.feeTitles,
      registry?.phone ?? '',
      registry?.vehicleOwnerName ?? '',
      registry?.operatorName ?? '',
    ].join(' ');
  };
  const columns: DataTableColumn<MemberTransactionRow>[] = [
    { id: 'vehicleNumber', header: 'गाडी नं.', cell: (row) => toNepaliDigits(row.receipt.vehicleNumber) },
    { id: 'memberNumber', header: 'सदस्य नं.', cell: (row) => row.memberNumber },
    { id: 'ownerName', header: 'सदस्य / धनी', cell: (row) => row.receipt.customerName || '—' },
    { id: 'phone', header: 'फोन नं.', cell: (row) => toNepaliDigits(row.phone) },
    { id: 'receiptNumber', header: 'रसिद नं.', cell: (row) => toNepaliDigits(row.receipt.receiptNumber) },
    { id: 'date', header: 'कारोबार मिति', cell: (row) => formatReportDate(row.receipt.paymentDate) },
    { id: 'feeTitles', header: 'कारोबार विवरण', cell: (row) => row.feeTitles },
    { id: 'amount', header: <div className="text-right">रकम</div>, cell: (row) => <div className="text-right tabular-nums">{formatReportAmount(row.receipt.totalAmount)}</div>, cellClassName: 'text-right' },
    { id: 'paymentMethod', header: 'भुक्तानी तरिका', cell: (row) => row.receipt.paymentMethod || '—' },
    { id: 'branch', header: 'शाखा', cell: (row) => row.receipt.branchName || '—' },
  ];
  const exportCsv = () => downloadReportCsv(
    rows,
    [
      { label: 'गाडी नं.', value: (row) => row.receipt.vehicleNumber },
      { label: 'पुरानो गाडी नं.', value: (row) => row.previousVehicleNumber },
      { label: 'सदस्य नं.', value: (row) => row.memberNumber },
      { label: 'सदस्य / धनी', value: (row) => row.receipt.customerName },
      { label: 'फोन नं.', value: (row) => row.phone },
      { label: 'रसिद नं.', value: (row) => row.receipt.receiptNumber },
      { label: 'कारोबार मिति', value: (row) => formatReportDate(row.receipt.paymentDate) },
      { label: 'कारोबार विवरण', value: (row) => row.feeTitles },
      { label: 'रकम', value: (row) => row.receipt.totalAmount },
      { label: 'भुक्तानी तरिका', value: (row) => row.receipt.paymentMethod },
      { label: 'शाखा', value: (row) => row.receipt.branchName },
    ],
    'membership-transaction-report',
    includeHeader ? reportHeaderCsvRows(header.details) : [],
  );

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="सदस्यता तथा कारोबार रिपोर्ट"
        description="गाडी नम्बर, फोन नम्बर वा नामबाट खोजेर सदस्यको सम्पूर्ण बिल कारोबार हेर्नुहोस्।"
        details={header.details}
        detailsError={header.error}
        includeHeaderDetails={includeHeader}
        onIncludeHeaderDetailsChange={setIncludeHeader}
        onExportCsv={exportCsv}
        exportDisabled={isLoading || Boolean(error) || rows.length === 0}
      />
      {error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">इतिहास लोड गर्न सकिएन: {error}</p> : null}
      {registryError ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">TQMS बाट थप सदस्य विवरण लोड भएन; BillResource मा उपलब्ध जानकारीबाट खोजी जारी छ।</p> : null}
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        सदस्य नम्बर र पुरानो गाडी नम्बर हालको BillResource/TQMS सदस्य सूचीमा उपलब्ध छैनन्, त्यसैले “—” देखाइन्छ। खोजीमा बिलको नाम, गाडी नम्बर, फोन, शाखा र रसिद विवरण समावेश छन्।
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label="कारोबार" value={toNepaliDigits(rows.length)} description="लोड भएका BillResource कारोबार" />
        <ReportMetric label="अद्वितीय सवारी" value={toNepaliDigits(new Set(records.map((row) => normalizeReportKey(row.vehicleNumber))).size)} description="गाडी नम्बरको आधारमा गणना" />
        <ReportMetric label="भुक्तानी भएको रकम" value={`रु ${formatReportAmount(totalPaid)}`} description="भुक्तानी भएका छुट्टाछुट्टै रसिदको जम्मा" />
      </div>
      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-base font-semibold">सम्पूर्ण कारोबार इतिहास</h2>
        <ReportDataTable
          rows={rows}
          columns={columns}
          searchableText={searchableText}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          loadingLabel="सदस्य कारोबार इतिहास लोड हुँदैछ..."
          emptyTitle="कारोबार इतिहास भेटिएन"
          emptyDescription="खोजी परिवर्तन गर्नुहोस् वा BillResource विवरण जाँच गर्नुहोस्।"
          searchLabel="गाडी, फोन, नाम वा रसिद नं. खोज्नुहोस्"
        />
      </section>
    </section>
  );
}
