import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { buildMahasangRows } from '@/features/reports/utils/summary-reports';
import {
  DEFAULT_MAHASANG_REPORT_COLUMNS,
  REQUIRED_MAHASANG_REPORT_COLUMNS,
} from '@/features/reports/utils/mahasang-report-columns';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';

function makeReceipt(overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id: 'receipt-1',
    billingType: 'MEMBERSHIP',
    customerPhone: '9800000000',
    customerPanNumber: '',
    receiptNumber: '१०२४',
    fiscalYear: '२०८३/८४',
    vehicleNumber: 'BA 1 CHA 1111',
    finalDigits: '1111',
    customerName: 'सवारी धनी',
    organizationName: 'संस्था',
    billingDate: '२०८३/०७/१७',
    paymentDate: '२०८३/०७/१७',
    validUntil: '२०८४/०७/१७',
    paymentMethod: 'नगद',
    status: 'PAID',
    totalAmount: 3600,
    branchName: 'मुख्य शाखा',
    userName: 'प्रयोगकर्ता',
    bill: {
      id: 'bill-1',
      status: 'PAID',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: 'vehicle-1',
          vehicleNumber: 'BA 1 CHA 1111',
          vehicleType: 'बस',
          ownerName: 'सवारी धनी',
          operatorName: 'सञ्चालक',
          phone: '9800000001',
          smsPhone: '9800000002',
          address: '',
        },
        customer: undefined,
        branch: { id: 'branch-1', name: 'मुख्य शाखा', BranchCode: '01', address: '', phone: '', contactPerson: '' },
        fiscalYearId: 'fy-1',
        fiscalYearName: '२०८३/८४',
        billingDate: '२०८३/०७/१७',
        periodStart: '२०८३/०७/०१',
        periodEnd: '२०८४/०६/३०',
        billingMonths: 12,
        items: [],
        subtotal: 3600,
        discount: 0,
        total: 3600,
        paymentMethod: 'नगद',
        note: 'वार्षिक शुल्क',
      },
    },
    resourceContent: {},
    externalContent: null,
    printedCopyCount: 0,
    ...overrides,
  } as ReceiptRecord;
}

test('Mahasang report includes owner/operator details and falls back to the available phone', () => {
  const [row] = buildMahasangRows([makeReceipt({ customerPhone: '' })]);

  assert.equal(row.ownerName, 'सवारी धनी');
  assert.equal(row.operatorName, 'सञ्चालक');
  assert.equal(row.ownerPhone, '9800000002');
  assert.deepEqual(
    getMemberOwnerDisplayLines(row.ownerName, row.operatorName),
    [
      { label: 'सञ्चालक:', name: 'सञ्चालक', suffix: '' },
      { label: 'धनीको नाम:', name: 'सवारी धनी', suffix: '' },
    ],
  );
});

test('Mahasang report uses a plain name for one owner and retains the complete report column set', () => {
  const [row] = buildMahasangRows([makeReceipt({
    customerName: 'एकल धनी',
    bill: {
      ...makeReceipt().bill,
      content: {
        ...makeReceipt().bill.content,
        vehicle: { ...makeReceipt().bill.content.vehicle, ownerName: 'एकल धनी', operatorName: 'एकल धनी' },
      },
    },
  })]);

  assert.deepEqual(
    getMemberOwnerDisplayLines(row.ownerName, row.operatorName),
    [{ label: '', name: 'एकल धनी', suffix: '' }],
  );
  assert.deepEqual(REQUIRED_MAHASANG_REPORT_COLUMNS, ['vehicleNumber']);
  assert.equal(DEFAULT_MAHASANG_REPORT_COLUMNS.length, 15);
});

test('Mahasang report separates paid membership and general income by billing type', () => {
  const [membership] = buildMahasangRows([makeReceipt()]);
  const [general] = buildMahasangRows([makeReceipt({ billingType: 'GENERAL' })]);

  assert.deepEqual(
    [membership.membershipIncome, membership.otherIncome, membership.total],
    [3600, 0, 3600],
  );
  assert.deepEqual(
    [general.membershipIncome, general.otherIncome, general.total],
    [0, 3600, 3600],
  );
});
