import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { MemberResourceRecord } from '@/features/members/model/member';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { calculateMembers } from '@/features/members/utils/member-calculations';

function receipt(): ReceiptRecord {
  return {
    id: 'bill-1',
    billingType: 'MEMBERSHIP',
    receiptNumber: 'R-1',
    fiscalYear: '2083/84',
    vehicleNumber: 'BA-09-KHA-5555',
    finalDigits: '5555',
    customerName: 'Vehicle owner',
    organizationName: 'Branch',
    billingDate: '2026-10-30',
    paymentDate: '2026-10-30',
    validUntil: '',
    paymentMethod: 'cash',
    status: 'PAID',
    totalAmount: 100,
    branchName: 'Branch',
    userName: 'Admin',
    printedCopyCount: 0,
    bill: {
      id: 'bill-1',
      receiptNumber: 'R-1',
      createdAt: '2026-10-30T10:00:00.000Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: 'billing-vehicle-1',
          vehicleNumber: 'BA-09-KHA-5555',
          vehicleType: 'Truck',
          ownerName: 'Vehicle owner',
          phone: '',
          address: '',
        },
        branch: { id: 'branch-1', name: 'Branch', BranchCode: 'BR', address: '', phone: '', contactPerson: '' },
        fiscalYearId: 'fy-1',
        fiscalYearName: '2083/84',
        billingDate: '2026-10-30',
        periodStart: '',
        periodEnd: '',
        billingMonths: 12,
        items: [],
        subtotal: 100,
        discount: 0,
        total: 100,
        paymentMethod: 'cash',
        note: '',
      },
    },
  };
}

function tqmsBlacklist(overrides: Partial<VehicleBlacklistRecord> = {}): VehicleBlacklistRecord {
  return {
    id: 'resource-1',
    vehicleId: 'tqms-vehicle-1',
    vehicleNumber: 'BA 09 KHA 5555',
    vehicleType: 'Truck',
    ownerName: 'Vehicle owner',
    phone: '',
    branch: 'Branch',
    performedBy: null,
    isBlacklisted: true,
    blacklistedReason: 'Test',
    blacklistedAt: '2026-10-30T10:00:00.000Z',
    blacklistSource: 'billing-member',
    tags: [],
    ...overrides,
  };
}

function memberResource(overrides: Partial<MemberResourceRecord> = {}): MemberResourceRecord {
  return {
    id: 'member-resource-1',
    vehicleId: 'billing-vehicle-1',
    vehicleNumber: 'BA 09 KHA 5555',
    status: 'BLACKLISTED',
    isDisplaced: false,
    isBlacklisted: true,
    reason: 'Test',
    taggedAt: '2026-10-30T10:00:00.000Z',
    performedBy: null,
    createdForDisplacement: false,
    statusBeforeDisplaced: '',
    resource: {},
    innerContent: {},
    ...overrides,
  };
}

describe('Member blacklist identity matching', () => {
  test('preserves both receipt owners for member list display', () => {
    const memberReceipt = receipt();
    memberReceipt.bill.content.vehicle.operatorName = 'Vehicle operator';

    const result = calculateMembers([memberReceipt], [], 'fy-1', [], []);

    assert.equal(result.records[0].ownerCount, 2);
    assert.equal(result.records[0].sanchalakName, 'Vehicle operator');
    assert.equal(result.records[0].sawariDhaniName, 'Vehicle owner');
  });

  test('keeps a single-owner receipt unlabelled in the member list', () => {
    const result = calculateMembers([receipt()], [], 'fy-1', [], []);

    assert.equal(result.records[0].ownerCount, 1);
    assert.equal(result.records[0].sanchalakName, '');
    assert.equal(result.records[0].sawariDhaniName, 'Vehicle owner');
  });

  test('matches a TQMS blacklist record by normalized vehicle number when IDs differ', () => {
    const result = calculateMembers([receipt()], [], 'fy-1', [], [tqmsBlacklist()]);

    assert.equal(result.records[0].isBlacklisted, true);
    assert.equal(result.records[0].status, 'BLACKLISTED');
    assert.equal(result.counts.blacklisted, 1);
    assert.equal(result.counts.nonMemberBlacklisted, 0);
  });

  test('matches a blacklisted MemberResource by normalized vehicle number', () => {
    const result = calculateMembers([receipt()], [], 'fy-1', [memberResource()], []);

    assert.equal(result.records[0].isBlacklisted, true);
    assert.equal(result.records[0].status, 'BLACKLISTED');
    assert.equal(result.counts.blacklisted, 1);
  });

  test('does not match an unrelated vehicle number as a member blacklist', () => {
    const result = calculateMembers(
      [receipt()],
      [],
      'fy-1',
      [],
      [tqmsBlacklist({ vehicleId: 'tqms-vehicle-2', vehicleNumber: 'BA-09-KHA-9999' })],
    );

    assert.equal(result.records[0].isBlacklisted, false);
    assert.equal(result.counts.blacklisted, 0);
    assert.equal(result.counts.nonMemberBlacklisted, 1);
  });
});
