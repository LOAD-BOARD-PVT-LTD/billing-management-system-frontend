import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildReceiptFilterOptions,
  matchesReceiptBranchFilter,
  matchesReceiptUserFilter,
} from '@/features/receipts/utils/receipt-filter-options';
import { createTestReceipt } from '@/tests/helpers/fixtures';

describe('Receipt filter options (branches & users)', () => {
  it('displays all 6 system Sakhas and all system users even when receipts only exist for 3 Sakhas and 2 users', () => {
    const systemBranches = [
      { name: 'मुख्य कार्यालय (हेटौंडा)' },
      { name: 'चितवन शाखा' },
      { name: 'परासी शाखा' },
      { name: 'काठमाडौं शाखा' },
      { name: 'पोखरा शाखा' },
      { name: 'वीरगञ्ज शाखा' },
    ];
    const systemUsers = [
      { name: 'Admin', email: 'admin@narayanisangh.com' },
      { name: 'Chitwan Operator', email: 'chitwan@narayanisangh.com' },
      { name: 'Pokhara Operator', email: 'pokhara@narayanisangh.com' },
      { name: 'Birgunj Operator', email: 'birgunj@narayanisangh.com' },
    ];
    const receipts = [
      createTestReceipt('1', { branchName: 'मुख्य कार्यालय (हेटौंडा)', userName: 'Admin' }),
      createTestReceipt('2', { branchName: 'चितवन शाखा', userName: 'Chitwan Operator' }),
      createTestReceipt('3', { branchName: 'परासी शाखा', userName: 'Admin' }),
    ];

    const result = buildReceiptFilterOptions(receipts, systemBranches, systemUsers);

    assert.equal(result.branches.length, 6);
    for (const branch of systemBranches) {
      assert.ok(result.branches.includes(branch.name), `Missing branch: ${branch.name}`);
    }

    assert.equal(result.users.length, 4);
    for (const user of systemUsers) {
      assert.ok(result.users.includes(user.name), `Missing user: ${user.name}`);
    }
  });

  it('populates options cleanly when there are zero receipts', () => {
    const result = buildReceiptFilterOptions(
      [],
      [{ name: 'Hetauda' }, { name: 'Chitwan' }],
      [{ name: 'Operator One', email: 'op1@example.com' }],
    );

    assert.deepEqual(result.branches, ['Chitwan', 'Hetauda']);
    assert.deepEqual(result.users, ['Operator One']);
  });

  it('deduplicates case-insensitively preferring system casing and keeps legacy receipt values', () => {
    const result = buildReceiptFilterOptions(
      [
        createTestReceipt('1', { branchName: 'hetauda', userName: 'admin' }),
        createTestReceipt('2', { branchName: 'Legacy Branch', userName: 'Legacy Operator' }),
      ],
      [{ name: 'Hetauda' }],
      [{ name: 'Admin', email: 'admin@example.com' }],
    );

    assert.deepEqual(result.branches, ['Hetauda', 'Legacy Branch']);
    assert.deepEqual(result.users, ['Admin', 'Legacy Operator']);
  });

  it('excludes empty strings and placeholder dashes from dropdown values', () => {
    const result = buildReceiptFilterOptions(
      [
        createTestReceipt('1', { branchName: '—', userName: '' }),
        createTestReceipt('2', { branchName: '   ', userName: '—' }),
      ],
      [{ name: '' }, { name: 'Valid Sakha' }],
      [{ name: '', email: '' }, { name: 'Valid User', email: 'valid@example.com' }],
    );

    assert.deepEqual(result.branches, ['Valid Sakha']);
    assert.deepEqual(result.users, ['Valid User']);
  });

  it('prevents duplicate email/name user options and matches receipts created with either display name or email', () => {
    const systemUsers = [
      { name: 'Sita Sharma', email: 'sita@narayanisangh.com' },
    ];
    const receiptWithEmail = createTestReceipt('1', { userName: 'sita@narayanisangh.com' });
    const receiptWithName = createTestReceipt('2', { userName: 'Sita Sharma' });

    const options = buildReceiptFilterOptions([receiptWithEmail, receiptWithName], [], systemUsers);
    assert.deepEqual(options.users, ['Sita Sharma']);

    assert.equal(matchesReceiptUserFilter(receiptWithEmail, 'Sita Sharma', systemUsers), true);
    assert.equal(matchesReceiptUserFilter(receiptWithName, 'Sita Sharma', systemUsers), true);
    assert.equal(matchesReceiptUserFilter(receiptWithEmail, 'all', systemUsers), true);
    assert.equal(matchesReceiptUserFilter(receiptWithEmail, 'Other User', systemUsers), false);
  });

  it('matches receipt branch filters case-insensitively and handles "all"', () => {
    assert.equal(matchesReceiptBranchFilter('चितवन शाखा', 'all'), true);
    assert.equal(matchesReceiptBranchFilter('Hetauda ', 'hetauda'), true);
    assert.equal(matchesReceiptBranchFilter('Chitwan', 'Pokhara'), false);
  });
});
