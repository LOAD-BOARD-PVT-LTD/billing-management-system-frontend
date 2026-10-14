import { apiClient } from '@/lib/api/client';
import { parseBillingEntity, parseBillingEntityList, toBillingEntityRequest } from '../schemas/billing-entity.schema';
import type { BillingEntityFields, BillingEntityRecord } from '../types/billing-entity.types';

export async function fetchBillingEntities(): Promise<BillingEntityRecord[]> {
  const payload = await apiClient.get<unknown>('read/BillingEntityResource/all');
  return parseBillingEntityList(payload);
}

export async function createBillingEntity(fields: BillingEntityFields): Promise<BillingEntityRecord> {
  const payload = await apiClient.post<unknown>(
    'create/BillingEntityResource',
    toBillingEntityRequest(fields),
  );
  return parseBillingEntity(payload);
}

export async function updateBillingEntity(id: string, fields: BillingEntityFields): Promise<void> {
  await apiClient.put<void>(
    `update/BillingEntityResource/${encodeURIComponent(id)}`,
    toBillingEntityRequest(fields, id),
  );
}
