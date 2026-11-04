import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { RECEIPT_EXPORT_HEADERS, buildReceiptExportCsv, receiptExportValue } from '@/features/receipts/utils/receipt-export';
import { formatReceiptDate } from '@/features/receipts/utils/receipt-date';
import type { ReceiptColumnId } from '@/features/receipts/utils/receipt-table-columns';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

function makeReceipt(overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id: 'receipt-1',
    billingType: 'MEMBERSHIP',
    receiptNumber: 'MAIN.23',
    vehicleNumber: 'DH-01-GHA',
    finalDigits: '2211',
    customerName: 'सवारी धनी',
    billingDate: '2026-11-03',
    validUntil: '2026-11-03',
    paymentMethod: 'नगद',
    status: 'CANCELLED',
    totalAmount: 1250,
    bill: {
      content: {
        vehicle: {
          vehicleNumber: 'DH-01-GHA',
          ownerName: 'सवारी धनी',
          operatorName: 'सञ्चालक',
          phone: '',
          smsPhone: '',
        },
      },
    },
    ...overrides,
  } as ReceiptRecord;
}

test('receipt export formats owner names as separate lines and leaves single owners unlabelled', () => {
  const singleOwnerReceipt = makeReceipt();
  singleOwnerReceipt.customerName = 'एकल धनी';
  singleOwnerReceipt.bill.content.vehicle.ownerName = 'एकल धनी';
  singleOwnerReceipt.bill.content.vehicle.operatorName = 'एकल धनी';

  assert.equal(
    receiptExportValue(makeReceipt(), 'customer'),
    'सञ्चालक: सञ्चालक\nधनीको नाम: सवारी धनी',
  );
  assert.equal(
    receiptExportValue(singleOwnerReceipt, 'customer'),
    'एकल धनी',
  );
});

test('receipt export uses spreadsheet headers, Nepali calendar dates, raw status and two-decimal amounts', () => {
  const receipt = makeReceipt();
  const expectedDate = convertADtoBS(new Date('2026-11-03T00:00:00')).replaceAll('/', '-');
  assert.equal(RECEIPT_EXPORT_HEADERS.receiptNumber, 'रसिद नं.');
  assert.equal(RECEIPT_EXPORT_HEADERS.paymentDate, 'भु. मिति');
  assert.equal(formatReceiptDate(receipt.billingDate), expectedDate);
  assert.equal(formatReceiptDate(receipt.validUntil), expectedDate);
  assert.equal(receiptExportValue(receipt, 'paymentDate'), expectedDate);
  assert.equal(receiptExportValue(receipt, 'validUntil'), expectedDate);
  assert.match(expectedDate, /^\d{4}-\d{2}-\d{2}$/u);
  assert.equal(receiptExportValue(receipt, 'status'), 'CANCELLED');
  assert.equal(receiptExportValue(receipt, 'receiptNumber'), 'MAIN.२३');
  assert.equal(receiptExportValue(receipt, 'finalDigits'), '२२११');
  assert.equal(receiptExportValue(receipt, 'totalAmount'), '०.००');
});

test('receipt export CSV keeps owner line breaks inside a cell and follows selected column order', () => {
  const columns: ReceiptColumnId[] = ['receiptNumber', 'customer', 'status', 'totalAmount'];
  const csv = buildReceiptExportCsv([makeReceipt()], columns);

  assert.equal(csv.split('\r\n')[0], '"रसिद नं.","सदस्य नाम","स्थिति","कुल रकम"');
  assert.match(csv, /"सञ्चालक: सञ्चालक\nधनीको नाम: सवारी धनी"/u);
  assert.match(csv, /"CANCELLED","०\.००"$/u);
});
