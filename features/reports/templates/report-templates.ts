import type { FeeHead } from '@/features/billing-rules/model/types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';
import type { MahasangReportRow } from '@/features/reports/types/summary-reports';
import type { MahasangReportColumnId } from '@/features/reports/utils/mahasang-report-columns';
import { formatReportAmount, formatReportDate } from '@/features/reports/utils/report-format';
import type { ReportExportColumn, ReportExportTemplate } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

function buildStandardHeader(header: ReportHeaderDetails) {
  const officeLine = `कार्यालय: ${header.officeAddress}`;
  const dateLine = `मिति: ${header.reportDateLine}`;
  return {
    organizationName: header.organizationName,
    subtitle: officeLine,
    title: header.reportTitle,
    leftMeta: officeLine,
    rightMeta: dateLine,
    continuationLine: `${header.organizationName} | ${header.reportTitle} | ${dateLine}`,
  };
}

export interface FeeHeadWiseExportRow {
  receipt: ReceiptRecord;
  rowNumber: number;
  amounts: Record<string, number>;
  operatorName: string;
}

export function createFeeHeadWiseReportTemplate(options: {
  header: ReportHeaderDetails;
  visibleFeeHeads: FeeHead[];
  allFeeHeads: FeeHead[];
  includeHeader?: boolean;
}): ReportExportTemplate<FeeHeadWiseExportRow> {
  const { header, visibleFeeHeads, allFeeHeads, includeHeader = true } = options;

  const feeHeadColumns: ReportExportColumn<FeeHeadWiseExportRow>[] = visibleFeeHeads.map((feeHead) => {
    const idx = allFeeHeads.findIndex((item) => item.id === feeHead.id);
    const num = idx >= 0 ? idx + 1 : 1;
    return {
      id: `fh-${feeHead.id}`,
      label: `${toNepaliDigits(num)}. ${feeHead.name}`,
      group: 'आम्दानी शीर्षक',
      width: 52,
      align: 'right',
      pdfValue: (row) => formatReportAmount(row.amounts[feeHead.id] ?? 0),
      excelValue: (row) => row.amounts[feeHead.id] ?? 0,
    };
  });

  return {
    id: 'fee-head-wise-report',
    filename: 'sirsak-anusar-report',
    sheetName: 'शीर्षक अनुसार रिपोर्ट',
    orientation: 'landscape',
    includeHeader,
    header: buildStandardHeader(header),
    columns: [
      {
        id: 'serial',
        label: 'क्र.सं.',
        width: 34,
        align: 'center',
        pdfValue: (_row, index) => toNepaliDigits(index + 1),
        excelValue: (_row, index) => index + 1,
      },
      {
        id: 'receiptNumber',
        label: 'रसिद नं.',
        width: 56,
        align: 'left',
        pdfValue: (row) => row.receipt.receiptNumber,
      },
      {
        id: 'vehicleNumber',
        label: 'सवारी नं.',
        width: 78,
        align: 'left',
        pdfValue: (row) => row.receipt.vehicleNumber || '-',
      },
      {
        id: 'owner',
        label: 'धनी / संचालक विवरण',
        width: 112,
        align: 'left',
        pdfValue: (row) => {
          const lines = getMemberOwnerDisplayLines(row.receipt.customerName, row.operatorName)
            .map((line) => `${line.label ? `${line.label} ` : ''}${line.name}${line.suffix}`.trim());
          if (row.receipt.bill.content.vehicle.phone) {
            lines.push(row.receipt.bill.content.vehicle.phone);
          }
          return lines.length ? lines : ['-'];
        },
      },
      {
        id: 'vehicleType',
        label: 'सवारी प्रकार',
        width: 60,
        align: 'left',
        pdfValue: (row) => row.receipt.bill.content.vehicle.vehicleType || '-',
      },
      ...feeHeadColumns,
      {
        id: 'total',
        label: 'जम्मा',
        width: 56,
        align: 'right',
        pdfValue: (row) => formatReportAmount(row.receipt.totalAmount),
        excelValue: (row) => row.receipt.totalAmount,
      },
      {
        id: 'note',
        label: 'कैफियत',
        width: 72,
        align: 'left',
        pdfValue: (row) => row.receipt.bill.content.note?.trim() || '-',
      },
    ],
    summaryFooter: (rows) => {
      const grandTotal = rows.reduce((sum, row) => sum + row.receipt.totalAmount, 0);
      return [
        { label: `जम्मा रसिद: ${toNepaliDigits(rows.length)} वटा` },
        { label: 'कुल रकम', value: `रु ${formatReportAmount(grandTotal)}` },
      ];
    },
  };
}

export function createMahasangReportTemplate(options: {
  header: ReportHeaderDetails;
  visibleColumns: MahasangReportColumnId[];
  columnLabels: Record<MahasangReportColumnId, string>;
  includeHeader?: boolean;
}): ReportExportTemplate<MahasangReportRow> {
  const { header, visibleColumns, columnLabels, includeHeader = true } = options;

  const columnMap: Record<MahasangReportColumnId, ReportExportColumn<MahasangReportRow>> = {
    vehicleNumber: { id: 'vehicleNumber', label: columnLabels.vehicleNumber, width: 78, pdfValue: (r) => r.vehicleNumber || '-' },
    previousVehicleNumber: { id: 'previousVehicleNumber', label: columnLabels.previousVehicleNumber, width: 72, pdfValue: (r) => r.previousVehicleNumber || '-' },
    vehicleType: { id: 'vehicleType', label: columnLabels.vehicleType, width: 62, pdfValue: (r) => r.vehicleType || '-' },
    ownerName: {
      id: 'ownerName',
      label: columnLabels.ownerName,
      width: 112,
      pdfValue: (r) => getMemberOwnerDisplayLines(r.ownerName, r.operatorName)
        .map((line) => `${line.label ? `${line.label} ` : ''}${line.name}${line.suffix}`.trim()),
    },
    ownerPhone: { id: 'ownerPhone', label: columnLabels.ownerPhone, width: 62, pdfValue: (r) => r.ownerPhone || '-' },
    note: { id: 'note', label: columnLabels.note, width: 66, pdfValue: (r) => r.note || '-' },
    receiptNumber: { id: 'receiptNumber', label: columnLabels.receiptNumber, width: 52, pdfValue: (r) => r.receiptNumber },
    membershipIncome: {
      id: 'membershipIncome',
      label: columnLabels.membershipIncome,
      group: 'आम्दानी शिर्षक',
      width: 52,
      align: 'right',
      pdfValue: (r) => formatReportAmount(r.membershipIncome),
      excelValue: (r) => r.membershipIncome,
    },
    otherIncome: {
      id: 'otherIncome',
      label: columnLabels.otherIncome,
      group: 'आम्दानी शिर्षक',
      width: 48,
      align: 'right',
      pdfValue: (r) => formatReportAmount(r.otherIncome),
      excelValue: (r) => r.otherIncome,
    },
    total: {
      id: 'total',
      label: columnLabels.total,
      group: 'आम्दानी शिर्षक',
      width: 52,
      align: 'right',
      pdfValue: (r) => formatReportAmount(r.total),
      excelValue: (r) => r.total,
    },
    periodMonths: {
      id: 'periodMonths',
      label: columnLabels.periodMonths,
      width: 38,
      align: 'center',
      pdfValue: (r) => toNepaliDigits(r.periodMonths),
      excelValue: (r) => r.periodMonths,
    },
    paymentMethod: { id: 'paymentMethod', label: columnLabels.paymentMethod, width: 46, align: 'center', pdfValue: (r) => r.paymentMethod || '-' },
    billingDate: { id: 'billingDate', label: columnLabels.billingDate, group: 'कारोबार मिति', width: 56, align: 'center', pdfValue: (r) => formatReportDate(r.billingDate) },
    periodStart: { id: 'periodStart', label: columnLabels.periodStart, group: 'कारोबार मिति', width: 56, align: 'center', pdfValue: (r) => formatReportDate(r.periodStart) },
    periodEnd: { id: 'periodEnd', label: columnLabels.periodEnd, group: 'कारोबार मिति', width: 56, align: 'center', pdfValue: (r) => formatReportDate(r.periodEnd) },
  };

  return {
    id: 'mahasang-report',
    filename: 'mahasang-report',
    sheetName: 'महासंघ रिपोर्ट',
    orientation: 'landscape',
    includeHeader,
    header: buildStandardHeader(header),
    columns: [
      {
        id: 'serial',
        label: 'सि.नं.',
        width: 34,
        align: 'center',
        pdfValue: (_r, idx) => toNepaliDigits(idx + 1),
        excelValue: (_r, idx) => idx + 1,
      },
      ...visibleColumns.map((colId) => columnMap[colId]),
    ],
    summaryFooter: (rows) => {
      const membership = rows.reduce((sum, r) => sum + r.membershipIncome, 0);
      const other = rows.reduce((sum, r) => sum + r.otherIncome, 0);
      const total = rows.reduce((sum, r) => sum + r.total, 0);
      return [
        { label: `${toNepaliDigits(rows.length)} वटा` },
        { label: 'सदस्यताबाट', value: formatReportAmount(membership) },
        { label: 'अन्य आम्दानी', value: formatReportAmount(other) },
        { label: 'जम्मा रू.', value: formatReportAmount(total) },
      ];
    },
  };
}

export interface VehicleCategoryExportRow {
  vehicleNumber: string;
  vehicleType: string;
  route: string;
  routePermitExpiry: string;
  ownerName: string;
  operatorName: string;
  note: string;
  receiptNumber: string;
  membershipIncome: number;
  otherIncome: number;
  total: number;
  periodMonths: number;
  paymentMethod: string;
  billingDate: string;
  periodStart: string;
  periodEnd: string;
}

export function createVehicleCategoryReportTemplate(options: {
  header: ReportHeaderDetails;
  includeHeader?: boolean;
}): ReportExportTemplate<VehicleCategoryExportRow> {
  const { header, includeHeader = true } = options;

  return {
    id: 'vehicle-category-income-report',
    filename: 'vehicle-category-income-report',
    sheetName: 'सवारी वर्गअनुसार रिपोर्ट',
    orientation: 'landscape',
    includeHeader,
    header: buildStandardHeader(header),
    columns: [
      { id: 'serial', label: 'क्र.सं.', width: 32, align: 'center', pdfValue: (_r, i) => toNepaliDigits(i + 1), excelValue: (_r, i) => i + 1 },
      { id: 'vehicleNumber', label: 'गाडी नं.', width: 72, pdfValue: (r) => r.vehicleNumber || '-' },
      { id: 'vehicleType', label: 'सवारी प्रकार', width: 56, pdfValue: (r) => r.vehicleType || '-' },
      { id: 'route', label: 'रुट परमिट', width: 64, pdfValue: (r) => r.route || '-' },
      {
        id: 'ownerName',
        label: 'धनीको नाम',
        width: 100,
        pdfValue: (r) => getMemberOwnerDisplayLines(r.ownerName, r.operatorName)
          .map((line) => `${line.label ? `${line.label} ` : ''}${line.name}${line.suffix}`.trim()),
      },
      { id: 'note', label: 'कैफियत', width: 60, pdfValue: (r) => r.note || '-' },
      { id: 'receiptNumber', label: 'रसिद नं.', width: 48, pdfValue: (r) => r.receiptNumber },
      { id: 'membershipIncome', label: 'सदस्यताबाट', group: 'आम्दानी शिर्षक', width: 48, align: 'right', pdfValue: (r) => formatReportAmount(r.membershipIncome), excelValue: (r) => r.membershipIncome },
      { id: 'otherIncome', label: 'अन्य', group: 'आम्दानी शिर्षक', width: 36, align: 'right', pdfValue: (r) => formatReportAmount(r.otherIncome), excelValue: (r) => r.otherIncome },
      { id: 'total', label: 'जम्मा', group: 'आम्दानी शिर्षक', width: 48, align: 'right', pdfValue: (r) => formatReportAmount(r.total), excelValue: (r) => r.total },
      { id: 'periodMonths', label: '(महिना)', width: 34, align: 'center', pdfValue: (r) => toNepaliDigits(r.periodMonths), excelValue: (r) => r.periodMonths },
      { id: 'paymentMethod', label: 'तरिका', width: 40, align: 'center', pdfValue: (r) => r.paymentMethod || '-' },
      { id: 'billingDate', label: 'का. मिति', group: 'कारोबार मिति', width: 52, align: 'center', pdfValue: (r) => formatReportDate(r.billingDate) },
      { id: 'periodStart', label: 'देखि', group: 'कारोबार मिति', width: 52, align: 'center', pdfValue: (r) => formatReportDate(r.periodStart) },
      { id: 'periodEnd', label: 'सम्म', group: 'कारोबार मिति', width: 52, align: 'center', pdfValue: (r) => formatReportDate(r.periodEnd) },
    ],
    summaryFooter: (rows) => {
      const membership = rows.reduce((sum, r) => sum + r.membershipIncome, 0);
      const other = rows.reduce((sum, r) => sum + r.otherIncome, 0);
      const total = rows.reduce((sum, r) => sum + r.total, 0);
      return [
        { label: `${toNepaliDigits(rows.length)} वटा` },
        { label: 'सदस्यताबाट', value: formatReportAmount(membership) },
        { label: 'अन्य आम्दानी', value: formatReportAmount(other) },
        { label: 'जम्मा रू.', value: formatReportAmount(total) },
      ];
    },
  };
}

export interface MemberTransactionExportRow {
  paymentDate: string;
  validUntil: string;
  receiptNumber: string;
  remarks: string;
  totalAmount: number;
  extraAmount: number;
}

export function createMemberTransactionReportTemplate(options: {
  header: ReportHeaderDetails;
  filename: string;
  profile: Array<[string, string]>;
  includeHeader?: boolean;
}): ReportExportTemplate<MemberTransactionExportRow> {
  const { header, filename, profile, includeHeader = true } = options;

  return {
    id: 'member-transaction-report',
    filename: filename || 'member-transaction-report',
    sheetName: 'सदस्य कारोबार इतिहास',
    orientation: 'landscape',
    includeHeader,
    header: {
      ...buildStandardHeader(header),
      metaPairs: profile.map(([label, value]) => ({ label, value: value || '—' })),
    },
    columns: [
      { id: 'serial', label: 'सि.नं.', width: 36, align: 'center', pdfValue: (_r, i) => toNepaliDigits(i + 1), excelValue: (_r, i) => i + 1 },
      { id: 'paymentDate', label: 'मिति', width: 72, align: 'center', pdfValue: (r) => formatReportDate(r.paymentDate) },
      { id: 'validUntil', label: 'मिति सम्म', width: 72, align: 'center', pdfValue: (r) => formatReportDate(r.validUntil) },
      { id: 'receiptNumber', label: 'रसिद नं.', width: 72, align: 'left', pdfValue: (r) => r.receiptNumber },
      { id: 'remarks', label: 'कैफियत', width: 180, align: 'left', pdfValue: (r) => r.remarks || '-' },
      { id: 'totalAmount', label: 'रकम रु.', width: 78, align: 'right', pdfValue: (r) => formatReportAmount(r.totalAmount), excelValue: (r) => r.totalAmount },
      { id: 'extraAmount', label: 'जम्मा मध्ये अतिरिक्त', width: 88, align: 'right', pdfValue: (r) => formatReportAmount(r.extraAmount), excelValue: (r) => r.extraAmount },
    ],
    summaryFooter: (rows) => {
      const total = rows.reduce((sum, r) => sum + r.totalAmount, 0);
      const extra = rows.reduce((sum, r) => sum + r.extraAmount, 0);
      return [
        { label: `जम्मा कारोबार: ${toNepaliDigits(rows.length)} वटा` },
        { label: 'कुल रकम', value: `रु ${formatReportAmount(total)}` },
        { label: 'अतिरिक्त रकम', value: `रु ${formatReportAmount(extra)}` },
      ];
    },
  };
}
