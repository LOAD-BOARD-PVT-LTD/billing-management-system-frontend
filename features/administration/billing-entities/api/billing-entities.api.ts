import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseBillingEntity, parseBillingEntityList, toBillingEntityRequest } from '../schemas/billing-entity.schema';
import type { BillingEntityFields, BillingEntityRecord } from '../types/billing-entity.types';

export async function fetchBillingEntities(): Promise<BillingEntityRecord[]> {
  const payload = await apiClient.get<unknown>(endpoints.resources.billingEntity.list());
  return parseBillingEntityList(payload);
}

export async function createBillingEntity(fields: BillingEntityFields): Promise<BillingEntityRecord> {
  const payload = await apiClient.post<unknown>(
    endpoints.resources.billingEntity.create(),
    toBillingEntityRequest(fields),
  );
  return parseBillingEntity(payload);
}

export async function updateBillingEntity(id: string, fields: BillingEntityFields): Promise<void> {
  await apiClient.put<void>(
    endpoints.resources.billingEntity.update(id),
    toBillingEntityRequest(fields, id),
  );
}
