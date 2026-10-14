import type { UserRole } from '@/types/auth';

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string | null;
  branchId: string | null;
  branchName?: string | null;
};

export type UserFields = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId: string;
  status: 'Active' | 'Inactive';
};

export type UserUpdateFields = Omit<UserFields, 'password'> & {
  password?: string;
};

export type { UserRole };