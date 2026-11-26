import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getReceiptBillIdSortValue } from '@/lib/receipts/receipt-bill-sort';
import { getReceiptBillIdSortValue as reexportedSortValue } from '@/lib/receipts/receipt-number-display';

describe('Receipt Bill ID Sorting (getReceiptBillIdSortValue)', () => {
  it('re-exports the identical function from receipt-number-display for backward compatibility', () => {
    assert.strictEqual(reexportedSortValue, getReceiptBillIdSortValue);
  });

  it('extracts numeric values from plain, prefixed, and Devanagari receipt identifiers', () => {
    assert.equal(getReceiptBillIdSortValue('130', 'KTM.130')?.toString(), '130');
    assert.equal(getReceiptBillIdSortValue('  42  ', null)?.toString(), '42');
    assert.equal(getReceiptBillIdSortValue('१२५', null)?.toString(), '125');
    assert.equal(getReceiptBillIdSortValue('101', 'KTM.१।१०१')?.toString(), '101');
  });

  it('falls back to receiptNumber when receiptId is empty or non-numeric', () => {
    assert.equal(getReceiptBillIdSortValue('', 'KTM.28')?.toString(), '28');
    assert.equal(getReceiptBillIdSortValue(null, 'MAIN.०९८')?.toString(), '98');
    assert.equal(getReceiptBillIdSortValue('legacy-prefix', 'BR.405 ')?.toString(), '405');
  });

  it('preserves full BigInt precision beyond Number.MAX_SAFE_INTEGER', () => {
    const huge = '90071992547409931234';
    assert.equal(getReceiptBillIdSortValue(huge, null)?.toString(), huge);
  });

  it('returns null when neither receiptId nor receiptNumber ends with digits', () => {
    assert.equal(getReceiptBillIdSortValue('', ''), null);
    assert.equal(getReceiptBillIdSortValue(null, undefined), null);
    assert.equal(getReceiptBillIdSortValue('legacy-bill', 'MAIN.ABC'), null);
  });

  it('sorts numeric IDs accurately in ascending and descending order', () => {
    const unsorted = ['100', '2', '11', '99'];
    const ascending = [...unsorted].sort((a, b) => {
      const left = getReceiptBillIdSortValue(a, null) ?? BigInt(0);
      const right = getReceiptBillIdSortValue(b, null) ?? BigInt(0);
      return left < right ? -1 : left > right ? 1 : 0;
    });
    assert.deepEqual(ascending, ['2', '11', '99', '100']);
    assert.deepEqual([...ascending].reverse(), ['100', '99', '11', '2']);
  });
});
