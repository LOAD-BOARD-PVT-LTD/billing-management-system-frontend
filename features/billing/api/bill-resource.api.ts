import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { formatBranchReceiptNumber } from '@/lib/receipts/receipt-number-display';
import type {
	CreateBillInput,
	GeneralBillInput,
	BillResourceContent,
	BillResourcePayload,
	MembershipBillInput,
	SavedBill,
} from '@/features/billing/model/bill.types';

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

function distinctOperatorName(ownerName: string, operatorName: string | undefined): string | null {
	const owner = ownerName.trim();
	const operator = operatorName?.trim() ?? '';
	if (!operator || operator.toLocaleLowerCase() === owner.toLocaleLowerCase()) return null;
	return operator;
}

export function buildBillResourceContent(input: MembershipBillInput): BillResourcePayload & {
	vehicle: BillResourceContent['vehicle'];
};
export function buildBillResourceContent(input: GeneralBillInput): BillResourcePayload;
export function buildBillResourceContent(input: CreateBillInput): BillResourcePayload;
export function buildBillResourceContent(input: CreateBillInput): BillResourcePayload {
	const {
		createdBy,
		details,
		items,
		subtotal,
		discount,
		vatAmount = 0,
		vatRatePct = 0,
		vatBillingEntityIds = [],
		paymentMethod,
		note,
	} = input;
	const operatorName = input.billingType === 'GENERAL'
		? null
		: distinctOperatorName(input.vehicle.ownerName, input.vehicle.operatorName);
	return {
		billingType: input.billingType ?? 'MEMBERSHIP',
		...(createdBy ? { createdBy } : {}),
		...(input.billingType === 'GENERAL'
			? { customer: input.customer }
			: {
				vehicle: {
					id: input.vehicle.tqmsVehicleId,
					vehicleNumber: input.vehicle.vehicleNumber,
					vehicleType: input.vehicle.vehicleType,
					ownerName: input.vehicle.ownerName,
					...(operatorName ? { operatorName } : {}),
					...(input.vehicle.route?.trim() ? { route: input.vehicle.route.trim() } : {}),
					phone: input.vehicle.phone,
					smsPhone: input.vehicle.smsPhone || input.vehicle.phone,
					address: input.vehicle.ownerAddress,
				},
			}),
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
		...(vatAmount > 0 || vatRatePct > 0 ? {
			vatAmount,
			vatRatePct,
			vatBillingEntityIds,
		} : {}),
		total: Math.max(0, subtotal - discount + vatAmount),
		paymentMethod,
		note: note.trim(),
	};
}

export async function createBill(input: CreateBillInput): Promise<SavedBill> {
	const resourceContent = buildBillResourceContent(input);
	const content: BillResourceContent = {
		...resourceContent,
		vehicle: resourceContent.vehicle ?? {
			id: '',
			vehicleNumber: '',
			vehicleType: '',
			ownerName: resourceContent.customer?.name ?? '',
			phone: resourceContent.customer?.phone ?? '',
			address: resourceContent.customer?.address ?? '',
		},
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
