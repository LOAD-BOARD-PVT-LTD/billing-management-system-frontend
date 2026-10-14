import { apiClient } from '@/lib/api/client';
import { parseUser, parseUserList, toUserRequest, toUserUpdateRequest } from '../schemas/user.schema';
import type { UserFields, UserRecord, UserUpdateFields } from '../types/user.types';

export async function fetchUsers(): Promise<UserRecord[]> {
  return parseUserList(await apiClient.get<unknown>('read/UserResource/all'));
}

export async function fetchUser(id: string): Promise<UserRecord> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('A user ID is required.');
  return parseUser(await apiClient.get<unknown>(`read/UserResource/${encodeURIComponent(normalizedId)}`));
}

export async function createUser(fields: UserFields): Promise<void> {
  await apiClient.post<unknown>('create/UserResource', toUserRequest(fields));
}

export async function updateUser(id: string, fields: UserUpdateFields): Promise<void> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('A user ID is required.');
  await apiClient.put<void>(
    `update/UserResource/${encodeURIComponent(normalizedId)}`,
    toUserUpdateRequest(fields),
  );
}
