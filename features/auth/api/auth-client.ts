// features/auth/api/auth-client.ts
import type { LoginCredentials, User } from '@/types/auth';
import { getAccessToken, removeAccessToken, setAccessToken } from './token-storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/u, '') ?? '';

type BackendLoginResponse = {
  email: string;
  role: string;
  token: string;
  message?: string;
  error?: { message?: string };
};

function authEndpoint(path: 'login'): string {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured');
  }

  return `${API_BASE_URL}/auth/${path}`;
}

function normalizeRole(role: string): User['role'] {
  const normalizedRole = role.trim().toLowerCase();
  if (normalizedRole === 'admin' || normalizedRole === 'user' || normalizedRole === 'operator') {
    return normalizedRole as User['role'];
  }
  throw new Error(`Unsupported account role: ${role}`);
}

function userFromAccessToken(token = getAccessToken()): User | null {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) throw new Error('Invalid access token');

    const base64 = payload.replace(/-/gu, '+').replace(/_/gu, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const claims = JSON.parse(atob(paddedBase64)) as {
      sub?: string;
      email?: string;
      role?: string;
      exp?: number;
    };
    const email = claims.email ?? claims.sub;

    if (!email || !claims.role || (claims.exp && claims.exp * 1000 <= Date.now())) {
      removeAccessToken();
      return null;
    }

    return {
      id: email,
      email,
      role: normalizeRole(claims.role),
    };
  } catch {
    removeAccessToken();
    return null;
  }
}

export async function loginRequest(
  credentials: LoginCredentials,
): Promise<{ user: User }> {
  removeAccessToken();

  const response = await fetch(authEndpoint('login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const result = (await response.json().catch(() => null)) as BackendLoginResponse | null;

  if (!response.ok || !result?.email || !result.role || !result.token) {
    throw new Error(result?.error?.message ?? result?.message ?? 'Login failed');
  }

  setAccessToken(result.token);
  const user = userFromAccessToken(result.token);
  if (!user) {
    removeAccessToken();
    throw new Error('Login token did not contain a valid user identity and role.');
  }
  if (user.email.toLowerCase() !== result.email.trim().toLowerCase()) {
    removeAccessToken();
    throw new Error('Login response email does not match the access token.');
  }
  if (user.role !== normalizeRole(result.role)) {
    removeAccessToken();
    throw new Error('Login response role does not match the access token role.');
  }

  return { user };
}

export async function currentUserRequest(): Promise<User | null> {

  return userFromAccessToken();
   
}

export async function logoutRequest(): Promise<void> {
  removeAccessToken();
}