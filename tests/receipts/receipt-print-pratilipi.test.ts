import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

import { createReceiptPdfBytes } from '@/features/receipts/services/receipt-pdf-generator';
import { createTestReceipt } from '@/tests/helpers/fixtures';
import {
  assertNoForbiddenPatterns,
  readWorkspaceFile,
} from '@/tests/helpers/source-assertions';

async function loadLocalPublicAsset(assetPath: string): Promise<Uint8Array> {
  const cleanPath = assetPath.replace(/^\/+/, '');
  const buffer = await readFile(path.join(process.cwd(), 'public', cleanPath));
  return new Uint8Array(buffer);
}

describe('Client-Side Receipt Pratilipi Printing', () => {
  it('usePrintReceipt generates pratilipi PDFs client-side without invoking the public receipt route', () => {
    const hookSource = readWorkspaceFile('features', 'receipts', 'hooks', 'use-print-receipt.ts');

    assert.ok(hookSource.includes('createReceiptPdfBlob('), 'usePrintReceipt must generate PDF blobs client-side');
    assert.ok(hookSource.includes('URL.createObjectURL('), 'usePrintReceipt must open blob URLs in the print tab');
    assert.ok(hookSource.includes('copyNumberStart: receipt.printedCopyCount + 1'), 'usePrintReceipt must increment pratilipi copy numbering');
    assert.ok(hookSource.includes('resolveBillBranding('), 'usePrintReceipt must resolve tenant/entity branding');
    assert.ok(hookSource.includes('recordReceiptPrint('), 'usePrintReceipt must record the print count audit entry');

    assertNoForbiddenPatterns(
      hookSource,
      ['buildReceiptPdfUrl', 'receipt-pdf-url'],
      'usePrintReceipt',
    );
  });

  it('PrintableBillReceipt opens its generated blob URL instead of an external public URL', () => {
    const componentSource = readWorkspaceFile('features', 'receipts', 'components', 'PrintableBillReceipt.tsx');

    assert.ok(componentSource.includes("pdfState.status === 'ready'"), 'openPreview must check blob readiness');
    assert.ok(componentSource.includes('window.open(pdfState.url'), 'openPreview must open the blob URL');
    assertNoForbiddenPatterns(componentSource, ['buildReceiptPdfUrl'], 'PrintableBillReceipt');
  });

  it('generates multi-copy pratilipi PDF bytes cleanly with voided watermark and exact page count', async () => {
    const receipt = createTestReceipt('42', {
      status: 'CANCELLED',
      printedCopyCount: 1,
    });

    const bytes = await createReceiptPdfBytes(receipt.bill, 2, {
      voided: receipt.status === 'CANCELLED',
      copyNumberStart: receipt.printedCopyCount + 1,
      showCopyLabel: true,
      loadAsset: loadLocalPublicAsset,
    });

    assert.ok(bytes.length > 1000, 'Expected non-empty PDF bytes');
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');

    const parsedDoc = await PDFDocument.load(bytes);
    assert.equal(parsedDoc.getPageCount(), 2, '2 pratilipi copies must produce 2 PDF pages');
  });
});
