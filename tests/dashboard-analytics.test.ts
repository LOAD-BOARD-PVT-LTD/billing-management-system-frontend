import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCollectionSummaryData,
  buildDashboardKpiMetrics,
  buildIncomeTrendData,
  buildPaymentMethodSummaryData,
  buildRecentBillingsData,
  buildSystemActivityData,
  buildVehicleBreakdownData,
  filterReceiptsByFiscalYear,
  resolveMemberStatisticsWithFallback,
} from '@/features/dashboard/utils/dashboard-analytics';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { MemberCounts } from '@/features/members/utils/member-calculations';

function makeReceipt(id: string, overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id,
    billingType: 'MEMBERSHIP',
    customerPhone: '9855057608',
    customerPanNumber: '',
    receiptNumber: `MAIN.${id}`,
    fiscalYear: '2083/84',
    vehicleNumber: 'NA-6-KHA-1023',
    finalDigits: '1023',
    customerName: 'Raju Thapa',
    organizationName: 'नारायणी यातायात व्यवसायी संघ',
    billingDate: '2026-11-23',
    paymentDate: '2026-11-23',
    validUntil: '2026-12-22',
    paymentMethod: 'नगद',
    status: 'PAID',
    totalAmount: 2200,
    branchName: 'Main Branch',
    userName: 'Admin',
    printedCopyCount: 1,
    bill: {
      id,
      receiptNumber: `MAIN.${id}`,
      createdAt: '2026-11-23T06:00:00.000Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: `v-${id}`,
          vehicleNumber: 'NA-6-KHA-1023',
          vehicleType: 'Truck',
          ownerName: 'Raju Thapa',
          phone: '9855057608',
          address: 'हेटौंडा',
          route: 'हेटौंडा - काठमाडौं',
        },
        branch: {
          id: '1',
          name: 'Main Branch',
          BranchCode: 'MAIN',
          address: 'हेटौंडा',
          phone: '',
          contactPerson: '',
        },
        fiscalYearId: overrides.fiscalYear ?? '2083/84',
        fiscalYearName: overrides.fiscalYear ?? '2083/84',
        billingDate: '2026-11-23',
        periodStart: '2026-11-23',
        periodEnd: '2026-12-22',
        billingMonths: 1,
        items: [
          {
            feeHeadId: '3',
            title: 'सदस्यता शुल्क',
            billingEntityId: '1',
            billingEntity: 'संघ',
            ruleId: '5',
            amount: 2200,
          },
        ],
        subtotal: 2200,
        discount: 0,
        total: 2200,
        paymentMethod: 'नगद',
        note: 'मासिक बापत',
      },
    },
    ...overrides,
  };
}

describe('Dashboard live analytics & member count fallback', () => {
  it('falls back to member list counts when dashboard statistics API is unavailable', () => {
    const fallbackCounts: MemberCounts = {
      total: 42,
      active: 30,
      new: 8,
      inactive: 9,
      displaced: 3,
      blacklisted: 2,
      nonMemberBlacklisted: 1,
    };

    const resolved = resolveMemberStatisticsWithFallback(null, fallbackCounts);
    assert.equal(resolved.isFallback, true);
    assert.deepEqual(resolved.statistics, {
      members: 42,
      activeMembers: 30,
      newSubscriptions: 8,
      inactiveMembers: 9,
      displacedMembers: 3,
    });

    const apiStats = {
      members: 100,
      activeMembers: 80,
      newSubscriptions: 10,
      inactiveMembers: 15,
      displacedMembers: 5,
    };
    const fromApi = resolveMemberStatisticsWithFallback(apiStats, fallbackCounts);
    assert.equal(fromApi.isFallback, false);
    assert.deepEqual(fromApi.statistics, apiStats);
  });

  it('computes KPI metrics, income trend, collections, payment methods, recent bills, and activities from live receipts', () => {
    const receipts = [
      makeReceipt('1', { totalAmount: 3000, paymentMethod: 'नगद', fiscalYear: '2083/84' }),
      makeReceipt('2', { totalAmount: 2000, paymentMethod: 'QR', fiscalYear: '2083/84' }),
      makeReceipt('3', { totalAmount: 1500, status: 'CANCELLED', fiscalYear: '2083/84' }),
      makeReceipt('4', { totalAmount: 9000, fiscalYear: '2082/83' }),
    ];

    const fyReceipts = filterReceiptsByFiscalYear(receipts, '2083/84');
    assert.equal(fyReceipts.length, 3);

    const kpis = buildDashboardKpiMetrics({
      statistics: { members: 42, activeMembers: 30, newSubscriptions: 8, inactiveMembers: 9, displacedMembers: 3 },
      blacklistedCount: 2,
      fiscalYearReceipts: fyReceipts,
    });
    assert.equal(kpis.length, 8);
    assert.equal(kpis.find((m) => m.icon === 'income')?.value, 5000);
    assert.equal(kpis.find((m) => m.icon === 'vehicles')?.value, 2);

    const trend = buildIncomeTrendData(fyReceipts);
    assert.equal(trend.totalIncome, 5000);
    assert.equal(trend.points.length, 12);

    const feeHeads = buildCollectionSummaryData(fyReceipts);
    assert.equal(feeHeads.length, 1);
    assert.equal(feeHeads[0].label, 'सदस्यता शुल्क');

    const methods = buildPaymentMethodSummaryData(fyReceipts);
    assert.equal(methods.length, 2);
    assert.equal(methods[0].label, 'नगद');
    assert.equal(methods[0].amount, 3000);

    const recent = buildRecentBillingsData(fyReceipts, 5);
    assert.equal(recent.length, 3);

    const breakdown = buildVehicleBreakdownData([], [
      { tqmsVehicleType: 'Truck' },
      { tqmsVehicleType: 'Truck' },
      { tqmsVehicleType: 'Tipper' },
    ]);
    assert.equal(breakdown[0].label, 'Truck');
    assert.equal(breakdown[0].count, 2);

    const activities = buildSystemActivityData({
      fiscalYearReceipts: fyReceipts,
      inactiveCount: 9,
      blacklistedCount: 2,
      fiscalYear: '2083/84',
    });
    assert.ok(activities.length >= 3);
  });
});
