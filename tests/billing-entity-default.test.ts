import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBillingEntity, toBillingEntityRequest } from '@/features/administration/billing-entities/schemas/billing-entity.schema';
import { getDefaultBillingEntityId } from '@/features/administration/billing-entities/utils/billing-entity-default';
import type { BillingEntityFields, BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';

const entityFields: BillingEntityFields = {
  entity: 'Main Entity',
  registrationNumber: 'REG-1',
  panNumber: 'PAN-1',
  contactPerson: 'Contact',
  email: 'contact@example.com',
  phoneNumber: '1234567890',
  hotlineNumber: '',
  website: '',
  address: 'Address',
  status: 'ACTIVE',
  isDefault: true,
};

test('billing entity resources persist and parse the default flag', () => {
  const request = toBillingEntityRequest(entityFields);
  assert.equal(request.inner_content.Default, true);

  const parsed = parseBillingEntity({
    id: 'entity-1',
    resource_name: 'BillingEntityResource',
    inner_content: request.inner_content,
  });
  assert.equal(parsed.isDefault, true);
});

test('default entity selection prefers the active flagged entity and falls back to first active', () => {
  const entities: BillingEntityRecord[] = [
    { ...entityFields, id: 'inactive-default', status: 'INACTIVE' },
    { ...entityFields, id: 'active-first', isDefault: false },
    { ...entityFields, id: 'active-default', isDefault: true },
  ];

  assert.equal(getDefaultBillingEntityId(entities), 'active-default');
  assert.equal(getDefaultBillingEntityId(entities.slice(0, 2)), 'active-first');
  assert.equal(getDefaultBillingEntityId([]), '');
});
