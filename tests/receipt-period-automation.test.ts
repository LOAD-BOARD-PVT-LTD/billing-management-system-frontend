import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReceiptAutoPeriodToDateBs } from '@/lib/receipts/period';
import { formatReceiptItemLabel } from '@/features/receipts/utils/receipt-item-label';

function resolveExpiry(billingMonths: number, periodEndStrategy: 'MATCH_START_DAY' | 'END_OF_MONTH') {
	return resolveReceiptAutoPeriodToDateBs({
		periodFromBs: '2083-01-19',
		billingMonths,
		periodEndStrategy,
		hasRecurringRule: true,
		advanceMatchStartDay: periodEndStrategy === 'MATCH_START_DAY',
		periodToDateManuallyEdited: false,
		currentPeriodToBs: '',
	});
}

test('monthly periodic SAME_DAY validity advances the expiry by the selected months', () => {
	assert.equal(resolveExpiry(1, 'MATCH_START_DAY'), '2083-02-19');
	assert.equal(resolveExpiry(3, 'MATCH_START_DAY'), '2083-04-19');
});

test('monthly periodic END_OF_MONTH validity expires on the end of the selected month span', () => {
	assert.equal(resolveExpiry(1, 'END_OF_MONTH'), '2083-01-31');
	assert.equal(resolveExpiry(3, 'END_OF_MONTH'), '2083-03-32');
});

test('yearly periodic validity expires at the selected fiscal year end', () => {
	assert.equal(resolveReceiptAutoPeriodToDateBs({
		periodFromBs: '2081-04-01',
		billingMonths: 1,
		periodEndStrategy: 'FISCAL_YEAR_END',
		hasRecurringRule: true,
		advanceMatchStartDay: false,
		periodToDateManuallyEdited: false,
		currentPeriodToBs: '',
		selectedFiscalYear: '2081/82',
	}), '2082-03-32');
});

test('a manually selected expiry date overrides periodic auto-selection', () => {
	assert.equal(resolveReceiptAutoPeriodToDateBs({
		periodFromBs: '2083-01-19',
		billingMonths: 3,
		periodEndStrategy: 'MATCH_START_DAY',
		hasRecurringRule: true,
		advanceMatchStartDay: true,
		periodToDateManuallyEdited: true,
		currentPeriodToBs: '2083/02/16',
	}), '2083-02-16');
});

test('bill labels show the paid month count only for periodic items', () => {
	assert.equal(formatReceiptItemLabel({ title: 'सदस्यता नवीकरण शुल्क', billingMonths: 2 }), 'सदस्यता नवीकरण शुल्क (२ महिना)');
	assert.equal(formatReceiptItemLabel({ title: 'दुर्घटना सहायता कोष' }), 'दुर्घटना सहायता कोष');
});
