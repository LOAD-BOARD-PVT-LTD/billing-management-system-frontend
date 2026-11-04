import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { getArrearsListRows } from '@/features/vehicle/compliance/utils/arrears-list';

function vehicle(vehicleId: string, vehicleNumber: string): MemberVehicleDetails {
  const emptyPeriod = { startBs: '', startAd: '', expiryBs: '', expiryAd: '' };
  return {
    vehicleId,
    vehicleNumber,
    tqmsVehicleType: 'ट्रक',
    tqmsVehicleTypeId: 'type-1',
    ownerType: 'Main Owner',
    branch: 'शाखा',
    sanchalakName: 'सञ्चालक',
    sawariDhaniName: 'धनी',
    ownerCount: 2,
    phone: '9800000000',
    address: '',
    identityNumber: '',
    compliance: {
      insurance: emptyPeriod,
      bluebook: emptyPeriod,
      routePermit: emptyPeriod,
      checkPass: emptyPeriod,
    },
  };
}

function receipt(
  id: string,
  vehicleId: string,
  vehicleNumber: string,
  ruleId: string,
  billingDate: string,
  periodEnd: string,
  fiscalYearId = 'fy-1',
): ReceiptRecord {
  return {
    id,
    billingType: 'MEMBERSHIP',
    receiptNumber: `R-${id}`,
    fiscalYear: fiscalYearId,
    vehicleNumber,
    finalDigits: '1234',
    customerName: 'धनी',
    organizationName: 'शाखा',
    billingDate,
    paymentDate: billingDate,
    validUntil: periodEnd,
    paymentMethod: 'cash',
    status: 'PAID',
    totalAmount: 100,
    branchName: 'शाखा',
    userName: 'प्रशासक',
    printedCopyCount: 0,
    bill: {
      id,
      receiptNumber: `R-${id}`,
      createdAt: `${billingDate}T10:00:00.000Z`,
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: vehicleId,
          vehicleNumber,
          vehicleType: 'ट्रक',
          ownerName: 'धनी',
          operatorName: 'सञ्चालक',
          phone: '9800000000',
          address: '',
        },
        branch: { id: 'branch-1', name: 'शाखा', BranchCode: '01', address: '', phone: '', contactPerson: '' },
        fiscalYearId,
        fiscalYearName: fiscalYearId,
        billingDate,
        periodStart: '',
        periodEnd,
        billingMonths: 1,
        items: [{ feeHeadId: 'fee-1', title: 'सदस्यता', billingEntityId: '', billingEntity: '', ruleId, amount: 100 }],
        subtotal: 100,
        discount: 0,
        total: 100,
        paymentMethod: 'cash',
        note: '',
      },
    },
  };
}

describe('arrears and expiry list rows', () => {
  test('finds never-billed vehicles using normalized vehicle numbers', () => {
    const rows = getArrearsListRows({
      view: 'neverBilled',
      vehicles: [vehicle('tqms-1', 'BA 1 KHA 1234'), vehicle('tqms-2', 'BA 2 KHA 5678')],
      receipts: [receipt('1', 'billing-1', 'BA-1-KHA-1234', 'rule-1', '2026-01-01', '')],
      paidExpiredRuleId: '',
      monthlyFiscalYearId: '',
      monthlyRuleId: '',
    });

    assert.deepEqual(rows.map((row) => row.vehicleNumber), ['BA 2 KHA 5678']);
  });

  test('uses the configured billing rule and expired period for paid-expired rows', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiredDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const rows = getArrearsListRows({
      view: 'paidExpired',
      vehicles: [vehicle('v-1', 'BA-1-KHA-1234')],
      receipts: [
        receipt('1', 'v-1', 'BA-1-KHA-1234', 'selected-rule', '2026-01-01', expiredDate),
        receipt('2', 'v-2', 'BA-2-KHA-5678', 'other-rule', '2026-01-01', expiredDate),
        receipt('3', 'v-1', 'BA-1-KHA-1234', 'selected-rule', '2026-02-01', '2099-12-31'),
      ],
      paidExpiredRuleId: 'selected-rule',
      monthlyFiscalYearId: '',
      monthlyRuleId: '',
    });

    assert.deepEqual(rows, []);
  });

  test('limits monthly-paid rows to the configured rule and fiscal year', () => {
    const rows = getArrearsListRows({
      view: 'monthlyPaid',
      vehicles: [],
      receipts: [
        receipt('1', 'v-1', 'BA-1-KHA-1234', 'monthly-rule', '2026-01-01', '', 'fy-1'),
        receipt('2', 'v-2', 'BA-2-KHA-5678', 'monthly-rule', '2026-01-02', '', 'fy-2'),
      ],
      paidExpiredRuleId: '',
      monthlyFiscalYearId: 'fy-1',
      monthlyRuleId: 'monthly-rule',
    });

    assert.deepEqual(rows.map((row) => row.receiptNumber), ['R-1']);
  });
});
