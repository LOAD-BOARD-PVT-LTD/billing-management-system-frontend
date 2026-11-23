export interface ReceiptPdfUrlOptions {
  copies?: number;
  copyStart?: number;
  download?: boolean;
  showCopyLabel?: boolean;
}

export function buildReceiptPdfUrl(
  receiptId: string,
  options: ReceiptPdfUrlOptions = {},
): string {
  const encodedId = encodeURIComponent(String(receiptId).trim());
  const params = new URLSearchParams();

  if (options.copies !== undefined && Number.isFinite(options.copies)) {
    const normalizedCopies = Math.max(1, Math.min(5, Math.floor(options.copies)));
    if (normalizedCopies > 1) {
      params.set('copies', String(normalizedCopies));
    }
  }

  if (options.copyStart !== undefined && Number.isFinite(options.copyStart)) {
    const normalizedStart = Math.max(1, Math.floor(options.copyStart));
    if (normalizedStart > 1) {
      params.set('copyStart', String(normalizedStart));
    }
  }

  if (options.download) {
    params.set('download', '1');
  }

  if (options.showCopyLabel === false) {
    params.set('showCopyLabel', '0');
  }

  const query = params.toString();
  return `/receipts/${encodedId}/pdf${query ? `?${query}` : ''}`;
}
