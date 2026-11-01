import type { BillingEntityRecord } from '../types/billing-entity.types';

export function getDefaultBillingEntityId(entities: BillingEntityRecord[]): string {
  const activeEntities = entities.filter((entity) => entity.status === 'ACTIVE');
  return activeEntities.find((entity) => entity.isDefault)?.id ?? activeEntities[0]?.id ?? '';
}
