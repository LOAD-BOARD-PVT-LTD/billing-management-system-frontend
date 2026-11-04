const configuredBaseUrl = process.env.NEXT_PUBLIC_TQMS_BASE_URL?.trim();

export const TQMS_BASE_URL = configuredBaseUrl?.replace(/\/+$/u, '') ?? '';

export function getTqmsUrl(path: string): string {
  if (!TQMS_BASE_URL) {
    throw new Error('NEXT_PUBLIC_TQMS_BASE_URL must be configured to open TQMS links.');
  }
  return new URL(path.replace(/^\/+/u, ''), `${TQMS_BASE_URL}/`).toString();
}
