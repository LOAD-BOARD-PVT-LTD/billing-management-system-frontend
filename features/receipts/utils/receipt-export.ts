import { organizationConfig } from '@/constants/organization';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { ReceiptColumnId } from '@/features/receipts/utils/receipt-table-columns';
import { getReceiptVehicleOwners } from '@/features/receipts/utils/receipt-owners';
import { formatReceiptDate } from '@/features/receipts/utils/receipt-date';
import type { ReportExportTemplate } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

export const RECEIPT_EXPORT_HEADERS: Record<ReceiptColumnId, string> = {
  receiptNumber: 'रसिद नं.',
  vehicleNumber: 'सवारी नं.',
  finalDigits: 'अन्तिम अङ्क',
  customer: 'सदस्य नाम',
  paymentDate: 'भु. मिति',
  validUntil: 'भु. मिति सम्म',
  paymentMethod: 'भु. विधि',
  status: 'स्थिति',
  totalAmount: 'कुल रकम',
};

function exportOwnerName(receipt: ReceiptRecord): string {
  const vehicle = receipt.bill.content.vehicle;
  const owners = getReceiptVehicleOwners(
    receipt.customerName || vehicle.ownerName,
    receipt.billingType === 'MEMBERSHIP' ? vehicle.operatorName : '',
  );
  if (!owners.hasMultipleOwners) return owners.dhaniName || '—';
  return `संचालक: ${owners.sanchalakName}\nधनीको नाम: ${owners.dhaniName}`;
}

export function receiptExportValue(receipt: ReceiptRecord, column: ReceiptColumnId): string {
  switch (column) {
    case 'receiptNumber':
      return toNepaliDigits(receipt.receiptNumber);
    case 'vehicleNumber':
      return receipt.billingType === 'GENERAL' ? 'सामान्य बिल' : receipt.vehicleNumber;
    case 'finalDigits':
      return toNepaliDigits(receipt.finalDigits);
    case 'customer':
      return exportOwnerName(receipt);
    case 'paymentDate':
      return formatReceiptDate(receipt.billingDate);
    case 'validUntil':
      return formatReceiptDate(receipt.validUntil);
    case 'paymentMethod':
      return receipt.paymentMethod;
    case 'status':
      return receipt.status;
    case 'totalAmount':
      return toNepaliDigits((receipt.status === 'CANCELLED' ? 0 : receipt.totalAmount).toFixed(2));
  }
}

function escapeCsv(value: string): string {
  const safeValue = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function buildReceiptExportCsv(
  rows: ReceiptRecord[],
  columns: ReceiptColumnId[],
): string {
  return [
    columns.map((column) => escapeCsv(RECEIPT_EXPORT_HEADERS[column])).join(','),
    ...rows.map((receipt) => columns
      .map((column) => escapeCsv(receiptExportValue(receipt, column)))
      .join(',')),
  ].join('\r\n');
}

export function createReceiptsExportTemplate(
  columns: ReceiptColumnId[],
  fiscalYear: string,
): ReportExportTemplate<ReceiptRecord> {
  return {
    id: 'receipts-list',
    filename: `receipts-${fiscalYear.replaceAll('/', '-')}`,
    sheetName: 'रसिद सूची',
    orientation: 'landscape',
    header: {
      organizationName: organizationConfig.nameNepali,
      title: 'रसिद सूची',
      rightMeta: fiscalYear && fiscalYear !== 'all' ? `आर्थिक वर्ष: ${toNepaliDigits(fiscalYear)}` : undefined,
    },
    columns: [
      { id: 'serial', label: 'सि.नं.', width: 30, align: 'center', pdfValue: (_r, i) => toNepaliDigits(i + 1), excelValue: (_r, i) => i + 1 },
      ...columns.map((column) => ({
        id: column,
        label: RECEIPT_EXPORT_HEADERS[column],
        width: column === 'customer' ? 115 : column === 'vehicleNumber' ? 80 : 60,
        align: (column === 'totalAmount' ? 'right' : column === 'status' ? 'center' : 'left') as 'left' | 'center' | 'right',
        pdfValue: (receipt: ReceiptRecord) => receiptExportValue(receipt, column),
        ...(column === 'totalAmount'
          ? { excelValue: (receipt: ReceiptRecord) => (receipt.status === 'CANCELLED' ? 0 : receipt.totalAmount) }
          : {}),
      })),
    ],
    summaryFooter: (rows) => {
      const total = rows.reduce((sum, r) => sum + (r.status === 'CANCELLED' ? 0 : r.totalAmount), 0);
      return [
        { label: `जम्मा रसिद: ${toNepaliDigits(rows.length)} वटा` },
        { label: 'कुल रकम', value: `रु ${toNepaliDigits(total.toFixed(2))}` },
      ];
    },
  };
}
