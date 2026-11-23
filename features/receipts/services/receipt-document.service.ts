'use client';

import type { SavedBill } from '@/features/billing/model/bill.types';
import type { CompanyBrandingOptions } from '@/shared/document-generation/types/document.types';
import { createReceiptPdfBytes } from './receipt-pdf-generator';

async function fetchBrowserAsset(path: string, name: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`${name} is empty.`);
  return bytes;
}

export async function createReceiptPdfBlob(
  bill: SavedBill,
  copies: number,
  options: {
    voided?: boolean;
    branding?: Partial<CompanyBrandingOptions>;
    showCopyLabel?: boolean;
    copyNumberStart?: number;
  } = {},
): Promise<Blob> {
  const bytes = await createReceiptPdfBytes(bill, copies, {
    ...options,
    loadAsset: fetchBrowserAsset,
  });
  const pdfBytes = new ArrayBuffer(bytes.length);
  new Uint8Array(pdfBytes).set(bytes);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
