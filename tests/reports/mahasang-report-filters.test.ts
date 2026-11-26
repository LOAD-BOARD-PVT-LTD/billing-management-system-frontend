import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { ReportFiltersCard } from '@/features/reports/components/ReportFiltersCard';
import { VehicleTypeMultiSelect } from '@/features/reports/components/VehicleTypeMultiSelect';
import type { IncomeReportFilters } from '@/features/reports/types/income-report';
import {
  buildMahasangFilterOptions,
  filterMahasangReceipts,
  type MahasangReportFilterValues,
} from '@/features/reports/utils/mahasang-report-filters';
import { createQueryClient } from '@/lib/query/query-client';
import { createTestReceipt } from '@/tests/helpers/fixtures';
import { assertContainsText, renderComponentHtml } from '@/tests/helpers/ui-test-utils';

function makeFilters(overrides: Partial<MahasangReportFilterValues> = {}): MahasangReportFilterValues {
  return {
    fiscalYear: 'all',
    branch: 'all',
    user: 'all',
    billType: 'all',
    feeHead: 'all',
    dateFrom: '',
    dateTo: '',
    dateBasis: 'paymentDate',
    vehicleTypes: [],
    ...overrides,
  };
}

describe('Mahasangh Report Filters & Reusable ReportFiltersCard', () => {
  it('filters receipts by fiscalYear, branch, feeHead, multi-select vehicleTypes, and date ranges', () => {
    const r1 = createTestReceipt('1', {
      fiscalYear: '2083/84',
      branchName: 'मुख्य कार्यालय',
      paymentDate: '2026-11-10',
      billingDate: '2026-11-10',
      validUntil: '2026-12-10',
    });
    r1.bill.content.vehicle.vehicleType = 'Truck 10T';
    r1.bill.content.periodStart = '2026-11-01';
    r1.bill.content.periodEnd = '2026-11-30';
    r1.bill.content.items = [{ feeHeadId: 'fh-1', title: 'सदस्यता शुल्क', billingEntityId: '1', billingEntity: 'संघ', ruleId: '1', amount: 2000 }];

    const r2 = createTestReceipt('2', {
      fiscalYear: '2083/84',
      branchName: 'चितवन शाखा',
      paymentDate: '2026-11-20',
      billingDate: '2026-11-20',
      validUntil: '2027-01-20',
    });
    r2.bill.content.vehicle.vehicleType = 'Tipper';
    r2.bill.content.periodStart = '2026-12-01';
    r2.bill.content.periodEnd = '2027-01-20';
    r2.bill.content.items = [{ feeHeadId: 'fh-2', title: 'हितकोष शुल्क', billingEntityId: '1', billingEntity: 'संघ', ruleId: '2', amount: 1500 }];

    const r3 = createTestReceipt('3', {
      fiscalYear: '2082/83',
      branchName: 'मुख्य कार्यालय',
      paymentDate: '2025-11-05',
      billingDate: '2025-11-05',
      validUntil: '2025-11-30',
    });
    r3.bill.content.vehicle.vehicleType = 'Container';
    r3.bill.content.periodStart = '2025-11-01';
    r3.bill.content.periodEnd = '2025-11-30';

    const receipts = [r1, r2, r3];

    assert.equal(filterMahasangReceipts(receipts, makeFilters({ fiscalYear: '2083/84' })).length, 2);
    assert.equal(filterMahasangReceipts(receipts, makeFilters({ branch: 'चितवन शाखा' })).length, 1);
    assert.equal(filterMahasangReceipts(receipts, makeFilters({ feeHead: 'fh-2' })).length, 1);
    assert.equal(filterMahasangReceipts(receipts, makeFilters({ vehicleTypes: ['truck 10t', 'Container'] })).length, 2);

    // Date basis: paymentDate vs billingDate (validity period overlap)
    assert.equal(
      filterMahasangReceipts(receipts, makeFilters({ dateFrom: '2026-11-01', dateTo: '2026-11-15', dateBasis: 'paymentDate' }))
        .map((r) => r.id)
        .join(','),
      '1',
    );
    assert.equal(
      filterMahasangReceipts(receipts, makeFilters({ dateFrom: '2026-12-15', dateTo: '2026-12-31', dateBasis: 'billingDate' }))
        .map((r) => r.id)
        .join(','),
      '2',
    );

    // Invalid date range yields 0 rows
    assert.equal(
      filterMahasangReceipts(receipts, makeFilters({ dateFrom: '2026-12-30', dateTo: '2026-12-01' })).length,
      0,
    );
  });

  it('builds deduplicated Mahasangh filter options across settings, vehicle types, rules, branches, and receipts', () => {
    const r1 = createTestReceipt('1', { fiscalYear: '2083/84', branchName: 'चितवन शाखा' });
    r1.bill.content.vehicle.vehicleType = 'Tipper';

    const options = buildMahasangFilterOptions({
      receipts: [r1],
      systemBranches: [{ name: 'चितवन शाखा' }, { name: 'पोखरा शाखा' }],
      billingRuleFeeHeads: [{ id: '3', title: 'सदस्यता शुल्क' }, { id: '2', title: 'नवीकरण शुल्क' }],
      vehicleTypeRecords: [{ vehicleTypes: ['Truck', 'tipper'] }],
      memberVehicles: [{ tqmsVehicleType: 'Container 10T' }],
      settings: {
        defaultGroupId: 'g1',
        defaultVehicleTypes: ['Bus'],
        vehicleTypeGroups: [{ id: 'g1', name: 'Main', vehicleTypes: ['Trailer'] }],
      },
    });

    assert.deepEqual(options.fiscalYears, ['2083/84']);
    assert.equal(options.branches.length, 2);
    assert.equal(options.feeHeads.length, 2);
    assert.equal(options.vehicleTypes.length, 5);
    assert.ok(options.vehicleTypes.includes('Container 10T'));
    assert.ok(options.vehicleTypes.includes('Trailer'));
  });

  it('renders ReportFiltersCard UI with all 7 required filter sections and selected vehicle type count', () => {
    const filters: IncomeReportFilters = {
      fiscalYear: '2083/84',
      branch: 'all',
      user: 'all',
      billType: 'all',
      feeHead: 'all',
      dateFrom: '',
      dateTo: '',
      dateBasis: 'paymentDate',
    };

    const html = renderComponentHtml(
      createElement(
        QueryClientProvider,
        { client: createQueryClient() },
        createElement(ReportFiltersCard, {
          idPrefix: 'mahasang',
          ariaLabel: 'महासंघ रिपोर्ट फिल्टर',
          filters,
          fiscalYears: ['2083/84', '2082/83'],
          branches: ['मुख्य कार्यालय', 'चितवन'],
          feeHeads: [{ value: 'fh-1', label: 'सदस्यता शुल्क' }],
          vehicleTypes: ['Truck', 'Tipper', 'Container', 'Trailer'],
          selectedVehicleTypes: ['Truck', 'Tipper', 'Container'],
          isFiltered: true,
          onUpdate: () => {},
          onClear: () => {},
        }),
      ),
    );

    assertContainsText(html, 'रिपोर्ट फिल्टर');
    assertContainsText(html, 'वित्तीय वर्ष');
    assertContainsText(html, 'शाखा');
    assertContainsText(html, 'आम्दानी शीर्षक');
    assertContainsText(html, 'सवारी साधन प्रकार');
    assertContainsText(html, '३ प्रकार छानिएको');
    assertContainsText(html, 'बाट मिति');
    assertContainsText(html, 'सम्म मिति');
    assertContainsText(html, 'मिति आधार');
    assertContainsText(html, 'भुक्तानी मिति वा मान्य अवधि अनुसार रिपोर्ट छान्नुहोस्।');
    assertContainsText(html, 'फिल्टर हटाउनुहोस्');
  });

  it('renders VehicleTypeMultiSelect trigger labels for empty, single, and multiple selections', () => {
    const queryClient = createQueryClient();
    const renderTrigger = (selected: string[]) => renderComponentHtml(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(VehicleTypeMultiSelect, {
          id: 'mahasang-vehicle-types',
          options: ['Truck', 'Tipper', 'Container'],
          selected,
          onChange: () => {},
        }),
      ),
    );

    assertContainsText(renderTrigger([]), 'सबै प्रकार');
    assertContainsText(renderTrigger(['Tipper']), 'Tipper');
    assertContainsText(renderTrigger(['Truck', 'Tipper', 'Container']), '३ प्रकार छानिएको');
  });
});
