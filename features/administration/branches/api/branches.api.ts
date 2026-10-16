import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseBranch, parseBranchList, toBranchRequest } from '../schemas/branch.schema';
import type { BranchFields, BranchRecord } from '../types/branch.types';

export async function fetchBranches(): Promise<BranchRecord[]> {
  return parseBranchList(await apiClient.get<unknown>(endpoints.resources.branch.list()));
}

export async function createBranch(fields: BranchFields): Promise<BranchRecord> {
  const result = await apiClient.post<unknown>(endpoints.resources.branch.create(), toBranchRequest(fields));
  return parseBranch(result);
}

export async function updateBranch(id: string, fields: BranchFields): Promise<void> {
  await apiClient.put<void>(
    endpoints.resources.branch.update(id),
    toBranchRequest(fields, id),
  );
}
