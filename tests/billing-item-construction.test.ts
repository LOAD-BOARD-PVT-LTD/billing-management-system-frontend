import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeeHeadBillingItems } from '@/features/billing/utils/build-fee-head-billing-items';
import type { BillingRule, FeeHead } from '@/features/billing-rules/model/types';

test('builds a zero-amount row for fee heads without an applicable rule, in configured order', () => {
  const feeHeads: FeeHead[] = [
    { id: 'fee-2', fiscalYearId: 'year-1', name: 'Sirsak Two', status: 'ACTIVE', displayOrder: 1 },
    { id: 'fee-1', fiscalYearId: 'year-1', name: 'Sirsak One', status: 'ACTIVE', displayOrder: 0 },
  ];
  const rules: BillingRule[] = [{
    id: 'rule-2',
    feeHeadId: 'fee-2',
    fiscalYearId: 'year-1',
    billingEntityId: 'entity-1',
    scope: 'VEHICLE_TYPE',
    vehicleCategoryId: 'vehicle-1',
    frequency: 'ONE_TIME',
    period: 'MONTH',
    validity: 'SAME_DAY',
    amount: 250,
    status: 'ACTIVE',
  }];
  const items = buildFeeHeadBillingItems(feeHeads, rules, [{
    id: 'entity-1',
    entity: 'Billing entity',
    registrationNumber: '',
    panNumber: '',
    contactPerson: '',
    email: '',
    phoneNumber: '',
    hotlineNumber: '',
    website: '',
    address: '',
    status: 'ACTIVE',
    isDefault: false,
  }], {});

  assert.deepEqual(items.map((item) => item.title), ['Sirsak One', 'Sirsak Two']);
  assert.equal(items[0].amount, 0);
  assert.equal(items[0].isUnconfigured, true);
  assert.equal(items[0].feeHeadId, 'fee-1');
  assert.equal(items[1].amount, 250);
  assert.equal(items[1].ruleId, 'rule-2');
});
