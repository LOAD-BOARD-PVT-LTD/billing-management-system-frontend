import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { filterIncomeReportRows } from '@/features/reports/utils/income-report-filters';
import {
  buildReportBranchOptions,
  buildReportFeeHeadOptions,
  buildReportUserOptions,
} from '@/features/reports/utils/report-filter-options';
import { mapIncomeReportRows } from '@/features/reports/services/income-report.service';
import { Role } from '@/types/auth';
import { createTestReceipt } from '@/tests/helpers/fixtures';

describe('Reusable Report Filter Options (Fiscal Year Fee Heads, Admin Branches, Branch-Scoped Users)', () => {
  it('shows only fee heads belonging to the selected fiscal year (matching Nepali/English/IDs) and all when fiscalYear is all', () => {
    const fiscalYears = [
      { id: 'fy-8384', code: '2083/84', name: '2083/84' },
      { id: 'fy-8283', code: '2082/83', name: '2082/83' },
    ];
    const billingRuleFeeHeads = [
      { id: 'fh-1', name: 'सदस्यता शुल्क (८३/८४)', fiscalYearId: 'fy-8384' },
      { id: 'fh-2', name: 'नवीकरण शुल्क (८२/८३)', fiscalYearId: 'fy-8283' },
      { id: 'fh-3', name: 'अतिरिक्त शुल्क (८३/८४)', fiscalYearId: '२०८३/८४' },
    ];

    const r8384 = createTestReceipt('1', { fiscalYear: '2083/84' });
    r8384.bill.content.items = [{ feeHeadId: 'fh-4', title: 'रसिद शुल्क (८३/८४)', billingEntityId: '1', billingEntity: 'संघ', ruleId: '1', amount: 500 }];

    const r8283 = createTestReceipt('2', { fiscalYear: '2082/83' });
    r8283.bill.content.items = [{ feeHeadId: 'fh-5', title: 'पुरानो शुल्क (८२/८३)', billingEntityId: '1', billingEntity: 'संघ', ruleId: '2', amount: 400 }];

    const scoped8384 = buildReportFeeHeadOptions({
      billingRuleFeeHeads,
      fiscalYears,
      receipts: [r8384, r8283],
      selectedFiscalYear: '2083/84',
    });
    assert.deepEqual(
      scoped8384.map((item) => item.value),
      ['fh-3', 'fh-4', 'fh-1'],
    );
    assert.equal(scoped8384.some((item) => item.value === 'fh-2' || item.value === 'fh-5'), false);

    const scoped8283 = buildReportFeeHeadOptions({
      billingRuleFeeHeads,
      fiscalYears,
      receipts: [r8384, r8283],
      selectedFiscalYear: '२०८२/८३',
    });
    assert.deepEqual(
      scoped8283.map((item) => item.value),
      ['fh-2', 'fh-5'],
    );

    const allYears = buildReportFeeHeadOptions({
      billingRuleFeeHeads,
      fiscalYears,
      receipts: [r8384, r8283],
      selectedFiscalYear: 'all',
    });
    assert.equal(allYears.length, 5);
  });

  it('shows all system branches for Admin and restricts non-Admin users to their assigned branch', () => {
    const systemBranches = [
      { id: 'b1', name: 'मुख्य कार्यालय' },
      { id: 'b2', name: 'चितवन शाखा' },
      { id: 'b3', name: 'पोखरा शाखा' },
      { id: 'b4', name: 'वीरगञ्ज शाखा' },
    ];
    const systemUsers = [
      { id: 'u-admin', name: 'Admin User', email: 'admin@sangh.com', branchId: 'b1', branchName: 'मुख्य कार्यालय' },
      { id: 'u-op', name: 'Pokhara Staff', email: 'pokhara@sangh.com', branchId: 'b3', branchName: null },
    ];
    const receipts = [
      createTestReceipt('1', { branchName: 'चितवन शाखा' }),
    ];

    const adminBranches = buildReportBranchOptions({
      receipts,
      systemBranches,
      authUser: { id: 'u-admin', email: 'admin@sangh.com', name: 'Admin User', role: Role.Admin },
      systemUsers,
    });
    assert.equal(adminBranches.length, 4);

    const operatorBranches = buildReportBranchOptions({
      receipts,
      systemBranches,
      authUser: { id: 'u-op', email: 'pokhara@sangh.com', name: 'Pokhara Staff', role: Role.Operator },
      systemUsers,
    });
    assert.deepEqual(operatorBranches, ['पोखरा शाखा']);
  });

  it('shows only users of the selected branch when a branch is selected, and all users when branch is all', () => {
    const systemBranches = [
      { id: 'b1', name: 'मुख्य कार्यालय' },
      { id: 'b2', name: 'चितवन शाखा' },
      { id: 'b3', name: 'पोखरा शाखा' },
    ];
    const systemUsers = [
      { name: 'Admin User', email: 'admin@sangh.com', branchId: 'b1', branchName: 'मुख्य कार्यालय' },
      { name: 'Chitwan Staff', email: 'chitwan@sangh.com', branchId: 'b2', branchName: 'चितवन शाखा' },
      { name: 'Pokhara Staff', email: 'pokhara@sangh.com', branchId: 'b3', branchName: 'पोखरा शाखा' },
    ];
    const receipts = [
      createTestReceipt('1', { branchName: 'चितवन शाखा', userName: 'chitwan@sangh.com' }),
      createTestReceipt('2', { branchName: 'चितवन शाखा', userName: 'Temp Collector' }),
      createTestReceipt('3', { branchName: 'पोखरा शाखा', userName: 'Pokhara Staff' }),
    ];

    const allUsers = buildReportUserOptions({
      receipts,
      systemUsers,
      systemBranches,
      selectedBranch: 'all',
    });
    assert.deepEqual(allUsers, ['Admin User', 'Chitwan Staff', 'Pokhara Staff', 'Temp Collector']);

    const chitwanUsers = buildReportUserOptions({
      receipts,
      systemUsers,
      systemBranches,
      selectedBranch: 'चितवन शाखा',
    });
    assert.deepEqual(chitwanUsers, ['Chitwan Staff', 'Temp Collector']);

    const rows = mapIncomeReportRows(receipts);
    const matchedRows = filterIncomeReportRows(
      rows,
      {
        fiscalYear: 'all',
        branch: 'चितवन शाखा',
        user: 'Chitwan Staff',
        billType: 'all',
        feeHead: 'all',
        dateFrom: '',
        dateTo: '',
        dateBasis: 'paymentDate',
      },
      systemUsers,
    );
    assert.equal(matchedRows.length, 1);
    assert.equal(matchedRows[0].receiptId, '1');
  });
});
