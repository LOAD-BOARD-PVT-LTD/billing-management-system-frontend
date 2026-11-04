import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
	getBillOwnerDisplayLines,
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

	test('formats two-owner bill and receipt lines with sanchalak before dhani', () => {
		assert.deepEqual(
			getReceiptOwnerDisplayLines('Nabil Bank Limited', 'Nikesh Kumar Karki', '9854035770'),
			[
				{
					label: 'सञ्चालक:',
					name: 'Nikesh Kumar Karki',
					suffix: '',
				},
				{
					label: 'धनीको नाम:',
					name: 'Nabil Bank Limited',
					suffix: ' (9854035770) बाट संघको विधान बमोजिम',
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

	test('uses member and operator name labels in bill print output', () => {
		assert.deepEqual(
			getBillOwnerDisplayLines('Member Name', 'Operator Name', '9800000000'),
			[
				{
					label: 'सदस्यको नाम:',
					name: 'Member Name',
					suffix: ' (9800000000) बाट संघको विधान बमोजिम',
				},
				{ label: 'संचालकको नाम:', name: 'Operator Name', suffix: '' },
			],
		);
		assert.deepEqual(
			getBillOwnerDisplayLines('Member Name', 'Member Name'),
			[{ label: 'सदस्यको नाम:', name: 'Member Name', suffix: ' बाट संघको विधान बमोजिम' }],
		);
	});

	test('uses the requested role labels with sanchalak before dhani in receipts and member lists', () => {
		assert.deepEqual(
			getMemberOwnerDisplayLines('Vehicle Owner', 'Vehicle Operator'),
			[
				{ label: 'सञ्चालक:', name: 'Vehicle Operator', suffix: '' },
				{ label: 'धनीको नाम:', name: 'Vehicle Owner', suffix: '' },
			],
		);
	});
});
