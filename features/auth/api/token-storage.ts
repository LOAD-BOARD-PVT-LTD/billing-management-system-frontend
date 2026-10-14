const TOKEN_KEY = 'billing_access_token';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}