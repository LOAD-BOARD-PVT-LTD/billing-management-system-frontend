import type { SavedBill } from '@/features/billing/model/bill.types';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { CompanyBrandingOptions } from '../types/document.types';

export function resolveBillBranding(
  bill: SavedBill,
  entities: Pick<BillingEntityRecord, 'id' | 'registrationNumber' | 'panNumber'>[],
): Partial<CompanyBrandingOptions> {
  const entityId = bill.content.items.find((item) => item.billingEntityId)?.billingEntityId;
  const entity = entities.find((record) => record.id === entityId);
  if (!entity) return {};

  return {
    registrationNumber: entity.registrationNumber,
    panNumber: entity.panNumber,
  };
}
