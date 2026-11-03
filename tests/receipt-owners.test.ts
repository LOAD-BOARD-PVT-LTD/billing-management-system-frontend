import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	getMemberOwnerDisplayLines,
	getReceiptOwnerDisplayLines,
	getReceiptVehicleOwners,
} from '@/features/receipts/utils/receipt-owners';

describe('receipt vehicle owners', () => {
	test('keeps distinct sanchalak and dhani names for labelled displays', () => {
		assert.deepEqual(
			getReceiptVehicleOwners('Dhani Name', 'Sanchalak Name'),
			{
				dhaniName: 'Dhani Name',
				sanchalakName: 'Sanchalak Name',
				hasMultipleOwners: true,
			},
		);
	});

	test('does not duplicate a single owner or add role labels', () => {
		assert.deepEqual(
			getReceiptVehicleOwners('Single Owner', ' single owner '),
			{
				dhaniName: 'Single Owner',
				sanchalakName: '',
				hasMultipleOwners: false,
			},
		);
	});

	test('uses the available name if only one owner name was saved', () => {
		assert.deepEqual(
			getReceiptVehicleOwners('', 'Single Operator'),
			{
				dhaniName: 'Single Operator',
				sanchalakName: '',
				hasMultipleOwners: false,
			},
		);
	});

	test('formats two-owner bill and receipt lines in the requested member-then-sanchalak order', () => {
		assert.deepEqual(
			getReceiptOwnerDisplayLines('Nabil Bank Limited', 'Nikesh Kumar Karki', '9854035770'),
			[
				{
					label: 'सदस्यको नाम:',
					name: 'Nabil Bank Limited',
					suffix: ' (9854035770) बाट संघको विधान बमोजिम',
				},
				{
					label: 'संचालकको नाम:',
					name: 'Nikesh Kumar Karki',
					suffix: '',
				},
			],
		);
	});

	test('keeps the single-owner bill line plain with its contact number', () => {
		assert.deepEqual(
			getReceiptOwnerDisplayLines('Single Owner', 'Single Owner', '9800000000'),
			[{ label: '', name: 'Single Owner', suffix: ' (9800000000)' }],
		);
	});

	test('uses member-list labels for distinct owners in receipt and member tables', () => {
		assert.deepEqual(
			getMemberOwnerDisplayLines('Vehicle Owner', 'Vehicle Operator'),
			[
				{ label: 'सवारी धनीको नाम:', name: 'Vehicle Owner', suffix: '' },
				{ label: 'सञ्चालकको नाम:', name: 'Vehicle Operator', suffix: '' },
			],
		);
	});
});
