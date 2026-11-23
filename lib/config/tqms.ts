const configuredBaseUrl = process.env.NEXT_PUBLIC_TQMS_BASE_URL?.trim();

export const TQMS_BASE_URL = configuredBaseUrl?.replace(/\/+$/u, '') ?? '';

export function getOptionalTqmsUrl(path: string): string | null {
  if (!TQMS_BASE_URL) {
    return null;
  }
  return new URL(path.replace(/^\/+/u, ''), `${TQMS_BASE_URL}/`).toString();
}

export function getTqmsUrl(path: string): string {
  const url = getOptionalTqmsUrl(path);
  if (!url) {
    throw new Error('NEXT_PUBLIC_TQMS_BASE_URL must be configured to open TQMS links.');
  }
  return url;
}
