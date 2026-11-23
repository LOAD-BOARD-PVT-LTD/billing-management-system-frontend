import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';
import { formatReportDate } from '@/features/reports/utils/report-format';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import type { ReportExportTemplate } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

export interface AmdaniExportRow {
  id: string;
  vehicleNumber: string;
  ownerName: string;
  operatorName: string;
  phone: string;
  remarks: string;
  receiptNumber: string;
  membershipAmount: number;
  otherAmount: number;
  totalAmount: number;
  billingMonths: number;
  paymentMethod: string;
  transactionDate: string;
  periodStart: string;
  periodEnd: string;
}

function formatFixedNepaliAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return toNepaliDigits(safe.toFixed(2));
}

function formatPaddedSerial(index: number): string {
  return toNepaliDigits(String(index + 1).padStart(4, '0'));
}

function formatDateDash(value: string): string {
  if (!value) return '-';
  const formatted = formatReportDate(value);
  return formatted === '—' ? '-' : formatted.replaceAll('/', '-');
}

function buildOwnerLines(row: AmdaniExportRow): string[] {
  const lines = getMemberOwnerDisplayLines(row.ownerName, row.operatorName);
  if (lines.length === 0) return ['-'];
  return lines.map((line) => `${line.label ? `${line.label} ` : ''}${line.name}${line.suffix}`.trim());
}

export function buildAmdaniExportRows(
  receipts: ReceiptRecord[],
  orderedReceiptIds?: string[],
): AmdaniExportRow[] {
  const byId = new Map(receipts.map((receipt) => [receipt.id, receipt]));
  const orderedReceipts: ReceiptRecord[] = [];
  const seen = new Set<string>();

  if (orderedReceiptIds && orderedReceiptIds.length > 0) {
    for (const id of orderedReceiptIds) {
      if (seen.has(id)) continue;
      const receipt = byId.get(id);
      if (receipt) {
        seen.add(id);
        orderedReceipts.push(receipt);
      }
    }
  } else {
    for (const receipt of receipts) {
      if (seen.has(receipt.id)) continue;
      seen.add(receipt.id);
      orderedReceipts.push(receipt);
    }
  }

  return orderedReceipts.map((receipt) => {
    const isGeneral = receipt.billingType === 'GENERAL';
    const membershipAmount = isGeneral ? 0 : receipt.totalAmount;
    const otherAmount = isGeneral ? receipt.totalAmount : 0;
    const transactionDate = receipt.bill.content.paidAt?.slice(0, 10) || receipt.paymentDate || receipt.billingDate;

    return {
      id: receipt.id,
      vehicleNumber: receipt.vehicleNumber || '-',
      ownerName: receipt.customerName || receipt.bill.content.vehicle.ownerName || '-',
      operatorName: receipt.bill.content.vehicle.operatorName || '',
      phone: receipt.customerPhone || receipt.bill.content.vehicle.smsPhone || receipt.bill.content.vehicle.phone || '-',
      remarks: receipt.bill.content.note?.trim() || '-',
      receiptNumber: receipt.receiptNumber,
      membershipAmount,
      otherAmount,
      totalAmount: receipt.totalAmount,
      billingMonths: receipt.bill.content.billingMonths || 0,
      paymentMethod: receipt.paymentMethod || '-',
      transactionDate,
      periodStart: receipt.bill.content.periodStart || '',
      periodEnd: receipt.bill.content.periodEnd || receipt.validUntil || '',
    };
  });
}

export function createAmdaniReportTemplate(options: {
  header: ReportHeaderDetails;
  filename: string;
  includeHeader?: boolean;
}): ReportExportTemplate<AmdaniExportRow> {
  const { header, filename, includeHeader = true } = options;
  const officeLine = `कार्यालय: ${header.officeAddress}`;
  const dateLine = `मिति: ${header.reportDateLine}`;

  return {
    id: 'amdani-report',
    filename: filename || 'dainik-amdani-report',
    sheetName: 'दैनिक आम्दानी',
    orientation: 'landscape',
    includeHeader,
    header: {
      organizationName: header.organizationName,
      subtitle: officeLine,
      title: 'दैनिक आम्दानी',
      leftMeta: officeLine,
      rightMeta: dateLine,
      continuationLine: `${header.organizationName} | दैनिक आम्दानी | ${dateLine}`,
    },
    columns: [
      {
        id: 'serial',
        label: 'क्र.सं.',
        width: 34,
        align: 'center',
        pdfValue: (_row, index) => formatPaddedSerial(index),
        excelValue: (_row, index) => index + 1,
      },
      {
        id: 'vehicleNumber',
        label: 'गाडी नं.',
        width: 82,
        align: 'left',
        pdfValue: (row) => row.vehicleNumber,
      },
      {
        id: 'ownerName',
        label: 'सवारी धनीको नाम',
        width: 112,
        align: 'left',
        pdfValue: (row) => buildOwnerLines(row),
        excelValue: (row) => buildOwnerLines(row).join('\n'),
      },
      {
        id: 'phone',
        label: 'धनीको फोन',
        width: 64,
        align: 'left',
        pdfValue: (row) => row.phone,
      },
      {
        id: 'remarks',
        label: 'विवरण',
        width: 68,
        align: 'left',
        pdfValue: (row) => row.remarks,
      },
      {
        id: 'receiptNumber',
        label: 'बिल नं.',
        width: 50,
        align: 'left',
        pdfValue: (row) => row.receiptNumber,
      },
      {
        id: 'membershipAmount',
        label: 'सदस्यता',
        group: 'आम्दानी शिर्षक',
        width: 48,
        align: 'right',
        pdfValue: (row) => formatFixedNepaliAmount(row.membershipAmount),
        excelValue: (row) => row.membershipAmount,
      },
      {
        id: 'otherAmount',
        label: 'अन्य',
        group: 'आम्दानी शिर्षक',
        width: 34,
        align: 'right',
        pdfValue: (row) => formatFixedNepaliAmount(row.otherAmount),
        excelValue: (row) => row.otherAmount,
      },
      {
        id: 'totalAmount',
        label: 'जम्मा रु.',
        group: 'आम्दानी शिर्षक',
        width: 48,
        align: 'right',
        pdfValue: (row) => formatFixedNepaliAmount(row.totalAmount),
        excelValue: (row) => row.totalAmount,
      },
      {
        id: 'billingMonths',
        label: '(महिना)',
        width: 34,
        align: 'center',
        pdfValue: (row) => (row.billingMonths > 0 ? toNepaliDigits(row.billingMonths) : '-'),
        excelValue: (row) => row.billingMonths,
      },
      {
        id: 'paymentMethod',
        label: 'तरिका',
        width: 38,
        align: 'center',
        pdfValue: (row) => row.paymentMethod,
      },
      {
        id: 'transactionDate',
        label: 'मिति',
        group: 'कारोबार मिति',
        width: 54,
        align: 'center',
        pdfValue: (row) => formatDateDash(row.transactionDate),
      },
      {
        id: 'periodStart',
        label: 'मिति देखि',
        group: 'कारोबार मिति',
        width: 54,
        align: 'center',
        pdfValue: (row) => formatDateDash(row.periodStart),
      },
      {
        id: 'periodEnd',
        label: 'मिति सम्म',
        group: 'कारोबार मिति',
        width: 54,
        align: 'center',
        pdfValue: (row) => formatDateDash(row.periodEnd),
      },
    ],
    summaryFooter: (rows) => {
      const totalMembership = rows.reduce((sum, row) => sum + row.membershipAmount, 0);
      const totalOther = rows.reduce((sum, row) => sum + row.otherAmount, 0);
      const grandTotal = rows.reduce((sum, row) => sum + row.totalAmount, 0);
      return [
        { label: `${toNepaliDigits(rows.length)} वटा`, widthWeight: 1.2 },
        { label: 'सदस्यता', value: formatFixedNepaliAmount(totalMembership), widthWeight: 1.2 },
        { label: 'अन्य', value: formatFixedNepaliAmount(totalOther), widthWeight: 1 },
        { label: 'जम्मा रू.', value: formatFixedNepaliAmount(grandTotal), widthWeight: 1.2 },
      ];
    },
    emptyMessage: 'छानिएको अवधिमा कुनै आम्दानी विवरण भेटिएन।',
  };
}
