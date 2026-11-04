import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateConfiguredVat } from '@/lib/receipts/vat-apply-rule';

test('configured VAT applies only to selected billing entities and respects the organization switch', () => {
  const items = [
    { entityId: 'taxable', amount: 1000 },
    { entityId: 'exempt', amount: 500 },
  ];
  assert.deepEqual(calculateConfiguredVat({
    items,
    subtotal: 1500,
    discount: 0,
    enabled: true,
    rate: 13,
    billingEntityIds: ['taxable'],
  }), {
    taxableAmount: 1000,
    vatAmount: 130,
    vatRatePct: 13,
    billingEntityIds: ['taxable'],
    vatApplicable: true,
  });

  assert.equal(calculateConfiguredVat({
    items,
    subtotal: 1500,
    discount: 0,
    enabled: false,
    rate: 13,
    billingEntityIds: ['taxable'],
  }).vatAmount, 0);
});

test('configured VAT proportionally allocates discounts across taxable and exempt charges', () => {
  const vat = calculateConfiguredVat({
    items: [
      { billingEntityId: 'taxable', amount: 1000 },
      { billingEntityId: 'exempt', amount: 1000 },
    ],
    subtotal: 2000,
    discount: 200,
    enabled: true,
    rate: 13,
    billingEntityIds: ['taxable'],
  });

  assert.equal(vat.taxableAmount, 900);
  assert.equal(vat.vatAmount, 117);
});
