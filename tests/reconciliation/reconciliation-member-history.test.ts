import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import {
	getRelatedMembershipBills,
	hasReconciliationHistory,
} from '@/features/reconciliation/components/ReconciliationMemberHistory';

function makeVehicle(overrides: Partial<BillingVehicle> = {}): BillingVehicle {
	return {
		id: 'resource-old',
		tqmsVehicleId: 'tqms-old',
		tqmsVehicleTypeId: 'type-1',
		vehicleNumber: 'Ba 1 Ja 1234',
		vehicleType: 'Taxi',
		ownerName: 'Old Owner',
		phone: '9800000000',
		smsPhone: '9800000000',
		ownerAddress: 'Kathmandu',
		branch: 'Kathmandu',
		fiscalYear: '',
		billingDate: '',
		periodStart: '',
		periodEnd: '',
		billingMonths: 0,
		company: '',
		companyShare: '',
		rate: '',
		rateDate: '',
		previousPeriod: '',
		remainingPeriod: '',
		resourceContent: {},
		...overrides,
	};
}

function makeResource(innerContent: Record<string, unknown> = {}): VehicleResourceDocument {
	return {
		id: 'resource-old',
		resource: {},
		innerContent: { VehicleId: 'tqms-old', MemberCode: 'ORG-MAIN-0289', ...innerContent },
		externalContent: {},
	};
}

function makeReceipt(
	id: string,
	vehicleId: string,
	vehicleNumber: string,
	billingType: ReceiptRecord['billingType'] = 'MEMBERSHIP',
): ReceiptRecord {
	const vehicle = makeVehicle({ tqmsVehicleId: vehicleId, vehicleNumber });
	return {
		id,
		billingType,
		receiptNumber: id,
		fiscalYear: '2083/84',
		vehicleNumber,
		finalDigits: '1234',
		customerName: vehicle.ownerName,
		organizationName: '',
		billingDate: '2083-01-01',
		paymentDate: '2083-01-01',
		validUntil: '2083-12-30',
		paymentMethod: 'CASH',
		status: 'PAID',
		totalAmount: 1000,
		branchName: 'Kathmandu',
		userName: 'admin',
		bill: {
			id,
			receiptNumber: id,
			createdAt: '2026-01-01T00:00:00.000Z',
			content: {
				billingType,
				vehicle: {
					id: vehicleId,
					vehicleNumber,
					vehicleType: vehicle.vehicleType,
					ownerName: vehicle.ownerName,
					phone: vehicle.phone,
					address: vehicle.ownerAddress,
				},
				branch: {
					id: 'branch-1',
					name: 'Kathmandu',
					BranchCode: 'KTM',
					address: '',
					phone: '',
					contactPerson: '',
				},
				fiscalYearId: 'fy-1',
				fiscalYearName: '2083/84',
				billingDate: '2083-01-01',
				periodStart: '2083-01-01',
				periodEnd: '2083-12-30',
				billingMonths: 12,
				items: [],
				subtotal: 1000,
				discount: 0,
				total: 1000,
				paymentMethod: 'CASH',
				note: '',
			},
		},
		printedCopyCount: 0,
	};
}

describe('Reconciliation membership history', () => {
	it('matches historical membership bills by TQMS ID or vehicle number after identifiers change', () => {
		const billingVehicle = makeVehicle();
		const billingResource = makeResource();
		const receipts = [
			makeReceipt('old-bill', 'tqms-old', 'Ba 1 Ja 1234'),
			makeReceipt('new-bill', 'tqms-new', 'Ba 1 Ja 1234'),
			makeReceipt('general-bill', 'tqms-old', 'Ba 1 Ja 1234', 'GENERAL'),
		];

		assert.deepEqual(
			getRelatedMembershipBills(receipts, billingVehicle, billingResource).map((receipt) => receipt.id),
			['old-bill', 'new-bill'],
		);
		assert.equal(hasReconciliationHistory(billingVehicle, billingResource, receipts), true);
	});

	it('matches history by vehicle number even when the bill has a nonmatching vehicle ID', () => {
		const receipt = makeReceipt('changed-id', 'older-id', 'Ba 1 Ja 1234');
		assert.deepEqual(
			getRelatedMembershipBills([receipt], makeVehicle(), makeResource()).map((item) => item.id),
			['changed-id'],
		);
	});

	it('matches history by TQMS ID even when the bill vehicle number has changed', () => {
		const receipt = makeReceipt('changed-number', 'tqms-old', 'Ba 2 Ja 9876');
		assert.deepEqual(
			getRelatedMembershipBills([receipt], makeVehicle(), makeResource()).map((item) => item.id),
			['changed-number'],
		);
	});

	it('uses vehicle number as a fallback only for legacy bills without a vehicle ID', () => {
		const receipt = makeReceipt('legacy', '', 'Ba 1 Ja 1234');
		assert.deepEqual(
			getRelatedMembershipBills([receipt], makeVehicle(), makeResource()).map((item) => item.id),
			['legacy'],
		);
	});

	it('requires a completed matching membership bill and not a member code', () => {
		assert.equal(
			hasReconciliationHistory(makeVehicle(), makeResource({ MemberCode: 'ORG-MAIN-0289' }), []),
			false,
		);
		assert.equal(
			hasReconciliationHistory(
				makeVehicle(),
				makeResource({ MemberCode: '' }),
				[makeReceipt('old-bill', 'tqms-old', 'Ba 1 Ja 1234')],
			),
			true,
		);
		assert.equal(
			hasReconciliationHistory(
				makeVehicle(),
				makeResource(),
				[makeReceipt('old-bill', 'tqms-old', 'Ba 1 Ja 1234')],
			),
			true,
		);
	});

	it('does not treat an unrelated bill as history for the old member', () => {
		assert.equal(
			hasReconciliationHistory(
				makeVehicle(),
				makeResource(),
				[makeReceipt('unrelated', 'another-id', 'Ba 2 Ja 9876')],
			),
			false,
		);
	});

	it('shows no historical membership when there are no bills or member codes', () => {
		assert.equal(hasReconciliationHistory(makeVehicle(), makeResource({ MemberCode: '' }), []), false);
	});

	it('does not count cancelled membership bills as completed billing history', () => {
		const cancelled = makeReceipt('cancelled', 'tqms-old', 'Ba 1 Ja 1234');
		cancelled.status = 'CANCELLED';

		assert.equal(
			hasReconciliationHistory(makeVehicle(), makeResource(), [cancelled]),
			false,
		);
	});

	it('matches legacy vehicle numbers containing Nepali digits', () => {
		const vehicle = makeVehicle({ vehicleNumber: 'बा १ ज १२३४' });
		const receipt = makeReceipt('legacy-nepali', '', 'बा-१-ज-१२३४');
		assert.deepEqual(
			getRelatedMembershipBills([receipt], vehicle, makeResource()).map((item) => item.id),
			['legacy-nepali'],
		);
	});
});
