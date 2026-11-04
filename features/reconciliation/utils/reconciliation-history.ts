import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

function normalizeVehicleKey(value: string): string {
	return value.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

function text(value: unknown): string {
	return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function getRelatedMembershipBills(
	receipts: ReceiptRecord[],
	billingVehicle: BillingVehicle,
	billingResource: VehicleResourceDocument,
	tqmsVehicle?: BillingVehicle | null,
): ReceiptRecord[] {
	const vehicleIds = new Set([
		billingVehicle.tqmsVehicleId,
		billingResource.innerContent.VehicleId,
		billingResource.innerContent.vehicleId,
		tqmsVehicle?.tqmsVehicleId,
	].map((id) => text(id).toLocaleLowerCase()).filter(Boolean));
	const vehicleNumbers = new Set([
		billingVehicle.vehicleNumber,
		billingResource.innerContent.VehicleNumber,
		billingResource.innerContent.vehicleNumber,
		tqmsVehicle?.vehicleNumber,
	].map((number) => normalizeVehicleKey(text(number))).filter(Boolean));

	return receipts
		.filter((receipt) => {
			if (receipt.billingType !== 'MEMBERSHIP' || receipt.status !== 'PAID') return false;
			const billVehicleId = receipt.bill.content.vehicle.id.trim().toLocaleLowerCase();
			const billVehicleNumber = normalizeVehicleKey(
				receipt.bill.content.vehicle.vehicleNumber || receipt.vehicleNumber,
			);
			return (billVehicleId && vehicleIds.has(billVehicleId))
				|| (billVehicleNumber && vehicleNumbers.has(billVehicleNumber));
		})
		.sort((left, right) => {
			const leftDate = Date.parse(left.bill.createdAt);
			const rightDate = Date.parse(right.bill.createdAt);
			return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
		});
}

export function hasVehicleBillingHistory(
	receipts: ReceiptRecord[],
	vehicleIds: readonly string[],
	vehicleNumbers: readonly string[],
): boolean {
	const normalizedIds = new Set(vehicleIds.map((id) => id.trim().toLocaleLowerCase()).filter(Boolean));
	const normalizedNumbers = new Set(vehicleNumbers.map(normalizeVehicleKey).filter(Boolean));
	return receipts.some((receipt) => {
		if (receipt.billingType !== 'MEMBERSHIP' || receipt.status !== 'PAID') return false;
		const billVehicleId = receipt.bill.content.vehicle.id.trim().toLocaleLowerCase();
		const billVehicleNumber = normalizeVehicleKey(
			receipt.bill.content.vehicle.vehicleNumber || receipt.vehicleNumber,
		);
		return (billVehicleId && normalizedIds.has(billVehicleId))
			|| (billVehicleNumber && normalizedNumbers.has(billVehicleNumber));
	});
}
