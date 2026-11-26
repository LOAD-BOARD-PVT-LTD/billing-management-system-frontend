import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAllVehicleTypeSegments,
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
import type { MemberCounts } from '@/features/members/utils/member-calculations';
import { createTestReceipt } from '@/tests/helpers/fixtures';

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
      createTestReceipt('1', { totalAmount: 3000, paymentMethod: 'नगद', fiscalYear: '2083/84' }),
      createTestReceipt('2', { totalAmount: 2000, paymentMethod: 'QR', fiscalYear: '2083/84' }),
      createTestReceipt('3', { totalAmount: 1500, status: 'CANCELLED', fiscalYear: '2083/84' }),
      createTestReceipt('4', { totalAmount: 9000, fiscalYear: '2082/83' }),
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

    const activities = buildSystemActivityData({
      fiscalYearReceipts: fyReceipts,
      inactiveCount: 9,
      blacklistedCount: 2,
      fiscalYear: '2083/84',
    });
    assert.ok(activities.length >= 3);
  });

  describe('Vehicle breakdown segments (buildAllVehicleTypeSegments & buildVehicleBreakdownData)', () => {
    it('returns an empty list when no vehicles or members exist', () => {
      assert.deepEqual(buildAllVehicleTypeSegments([], []), []);
      assert.deepEqual(buildVehicleBreakdownData([], []), []);
    });

    it('sorts segments descending and keeps up to 6 categories without collapsing into अन्य', () => {
      const vehicles = [
        { tqmsVehicleType: 'Truck' },
        { tqmsVehicleType: 'Truck' },
        { tqmsVehicleType: 'Tipper' },
        { tqmsVehicleType: 'Tanker' },
        { tqmsVehicleType: 'Trailer' },
        { tqmsVehicleType: 'Container' },
        { tqmsVehicleType: 'Mini Truck' },
      ];

      const all = buildAllVehicleTypeSegments([], vehicles);
      const summary = buildVehicleBreakdownData([], vehicles);

      assert.equal(all.length, 6);
      assert.equal(summary.length, 6);
      assert.equal(summary[0].label, 'Truck');
      assert.equal(summary[0].count, 2);
      assert.equal(summary.some((s) => s.label === 'अन्य'), false);
    });

    it('collapses categories beyond top 5 into अन्य in summary while preserving all types in full list', () => {
      const vehicles = [
        { tqmsVehicleType: 'Type A' },
        { tqmsVehicleType: 'Type A' },
        { tqmsVehicleType: 'Type B' },
        { tqmsVehicleType: 'Type B' },
        { tqmsVehicleType: 'Type C' },
        { tqmsVehicleType: 'Type D' },
        { tqmsVehicleType: 'Type E' },
        { tqmsVehicleType: 'Type F' },
        { tqmsVehicleType: 'Type G' },
      ];

      const all = buildAllVehicleTypeSegments([], vehicles);
      const summary = buildVehicleBreakdownData([], vehicles);

      assert.equal(all.length, 7);
      assert.equal(summary.length, 6);
      assert.equal(summary[5].label, 'अन्य');
      assert.equal(summary[5].count, 2);
    });
  });
});
