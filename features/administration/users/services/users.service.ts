import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  parseUser,
  parseUserList,
  parseUserPassword,
  toUserRequest,
  toUserUpdateRequest,
} from '../schemas/user.schema';
import type { UserFields, UserRecord, UserUpdateFields } from '../types/user.types';

export async function fetchUsers(): Promise<UserRecord[]> {
  return parseUserList(await apiClient.get<unknown>(endpoints.resources.user.list()));
}

export async function fetchUser(id: string): Promise<UserRecord> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('A user ID is required.');
  return parseUser(await apiClient.get<unknown>(endpoints.resources.user.read(normalizedId)));
}

export async function createUser(fields: UserFields): Promise<void> {
  await apiClient.post<unknown>(endpoints.resources.user.create(), toUserRequest(fields));
}

export async function updateUser(id: string, fields: UserUpdateFields): Promise<void> {
  const normalizedId = id.trim();
  if (!normalizedId) throw new Error('A user ID is required.');
  const password = fields.password || parseUserPassword(
    await apiClient.get<unknown>(endpoints.resources.user.read(normalizedId)),
  );
  await apiClient.put<void>(
    endpoints.resources.user.update(normalizedId),
    toUserUpdateRequest({ ...fields, password }, normalizedId),
  );
}
