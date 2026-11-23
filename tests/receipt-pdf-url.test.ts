import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { buildReceiptPdfUrl } from '@/features/receipts/utils/receipt-pdf-url';
import { createReceiptPdfBytes } from '@/features/receipts/services/receipt-pdf-generator';
import type { SavedBill } from '@/features/billing/model/bill.types';

describe('Receipt on-demand public PDF URL & generator', () => {
  it('builds clean public receipt PDF URLs with optional parameters', () => {
    assert.equal(buildReceiptPdfUrl('18'), '/receipts/18/pdf');
    assert.equal(buildReceiptPdfUrl('18', { copies: 1, copyStart: 1 }), '/receipts/18/pdf');
    assert.equal(
      buildReceiptPdfUrl('18', { copies: 2, copyStart: 3 }),
      '/receipts/18/pdf?copies=2&copyStart=3',
    );
    assert.equal(
      buildReceiptPdfUrl('bill/42', { download: true, showCopyLabel: false }),
      '/receipts/bill%2F42/pdf?download=1&showCopyLabel=0',
    );
  });

  it('generates a valid PDF document on the server without browser DOM or storage', async () => {
    const sampleBill: SavedBill = {
      id: '18',
      receiptNumber: 'HTD-00018',
      createdAt: '2026-11-23T06:00:00.000Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: 'v-1',
          vehicleNumber: 'ना ५ ख १२३४',
          vehicleType: 'Truck',
          ownerName: 'मान राज मोक्तान',
          phone: '9800000000',
          address: 'हेटौंडा',
          route: 'हेटौंडा - काठमाडौं',
        },
        branch: {
          id: '1',
          name: 'हेटौंडा',
          BranchCode: 'HTD',
          address: 'हेटौंडा',
          phone: '',
          contactPerson: '',
        },
        fiscalYearId: '2083/84',
        fiscalYearName: '2083/84',
        billingDate: '2026-11-23',
        periodStart: '2026-11-23',
        periodEnd: '2027-11-22',
        billingMonths: 12,
        items: [
          {
            feeHeadId: '3',
            title: 'सदस्यता शुल्क',
            billingEntityId: '1',
            billingEntity: 'नारायणी यातायात व्यवसायी संघ',
            ruleId: '5',
            amount: 2500,
          },
        ],
        subtotal: 2500,
        discount: 0,
        total: 2500,
        paymentMethod: 'eSewa',
        note: 'Test receipt',
      },
    };

    const bytes = await createReceiptPdfBytes(sampleBill, 1, {
      loadAsset: async (assetPath) => {
        const relativePath = assetPath.replace(/^\/+/u, '');
        const buf = await readFile(path.join(process.cwd(), 'public', relativePath));
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      },
    });

    assert.ok(bytes.length > 1000, 'Expected non-trivial PDF output');
    assert.equal(String.fromCharCode(...bytes.slice(0, 5)), '%PDF-');
  });
});
