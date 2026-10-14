import { apiClient } from '@/lib/api/client';
import { parseBranch, parseBranchList, toBranchRequest } from '../schemas/branch.schema';
import type { BranchFields, BranchRecord } from '../types/branch.types';

export async function fetchBranches(): Promise<BranchRecord[]> {
  return parseBranchList(await apiClient.get<unknown>('read/BranchResource/all'));
}

export async function createBranch(fields: BranchFields): Promise<BranchRecord> {
  const result = await apiClient.post<unknown>('create/BranchResource', toBranchRequest(fields));
  return parseBranch(result);
}

export async function updateBranch(id: string, fields: BranchFields): Promise<void> {
  await apiClient.put<void>(`update/BranchResource/${encodeURIComponent(id)}`, toBranchRequest(fields));
}
