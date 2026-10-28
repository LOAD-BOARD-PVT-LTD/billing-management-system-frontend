import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { formatBranchReceiptNumber } from '@/lib/receipts/receipt-number-display';
import type { CreateBillInput, BillResourceContent, BillResourcePayload, SavedBill } from '@/features/billing/model/bill.types';

function resourceId(value: unknown): string | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const record = value as Record<string, unknown>;
	for (const key of ['id', 'resourceId', 'resource_id']) {
		const id = record[key];
		if (typeof id === 'string' || typeof id === 'number') {
			const normalized = String(id).trim();
			if (normalized) return normalized;
		}
	}
	for (const key of ['data', 'result', 'resource']) {
		const nestedId = resourceId(record[key]);
		if (nestedId) return nestedId;
	}
	return null;
}

export function buildBillResourceContent(input: CreateBillInput): BillResourcePayload {
	const { vehicle, createdBy, details, items, subtotal, discount, paymentMethod, note } = input;
	return {
		...(createdBy ? { createdBy } : {}),
		vehicle: {
			id: vehicle.tqmsVehicleId,
			vehicleNumber: vehicle.vehicleNumber,
			vehicleType: vehicle.vehicleType,
			ownerName: vehicle.ownerName,
			phone: vehicle.phone,
			address: vehicle.ownerAddress,
		},
		branch: {
			id: details.branchId,
			name: details.branchName,
			BranchCode: details.branchCode,
			address: details.branchAddress,
			phone: details.branchPhone,
			contactPerson: details.branchContactPerson,
		},
		fiscalYearId: details.fiscalYearId,
		billingDate: details.billingDate,
		paidAt: new Date().toISOString(),
		periodStart: details.periodStart,
		periodEnd: details.periodEnd,
		billingMonths: details.billingMonths,
		items: items.map((item) => ({
			feeHeadId: item.feeHeadId ?? '',
			title: item.title.trim(),
			billingEntityId: item.entityId ?? '',
			billingEntity: item.entity.trim(),
			ruleId: item.ruleId ?? null,
			amount: item.amount,
		})),
		subtotal,
		discount,
		total: Math.max(0, subtotal - discount),
		paymentMethod,
		note: note.trim(),
	};
}

export async function createBill(input: CreateBillInput): Promise<SavedBill> {
	const resourceContent = buildBillResourceContent(input);
	const content: BillResourceContent = {
		...resourceContent,
		fiscalYearName: input.details.fiscalYearName,
	};
	const response = await apiClient.post<unknown>(endpoints.resources.bill.create(), {
		resource_name: 'BillResource',
		inner_content: resourceContent,
		external_content: null,
	});
	const id = resourceId(response);
	if (!id) throw new Error('The created BillResource did not return a resource ID.');

	return {
		id,
		receiptNumber: formatBranchReceiptNumber(content.branch.BranchCode, id),
		createdAt: new Date().toISOString(),
		content,
	};
}
