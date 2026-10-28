import type { BillingLine, BillingVehicle } from '@/features/billing/model/types';

export type BillDetails = {
	branchId: string;
	branchName: string;
	branchCode: string;
	branchAddress: string;
	branchPhone: string;
	branchContactPerson: string;
	allowManualReceiptAmountOverride: boolean;
	fiscalYearId: string;
	fiscalYearName: string;
	billingDate: string;
	periodStart: string;
	periodEnd: string;
	billingMonths: number;
};

export type BillResourceContent = {
	createdBy?: {
		id: string;
		name: string;
		username: string;
	};
	vehicle: {
		id: string;
		vehicleNumber: string;
		vehicleType: string;
		ownerName: string;
		phone: string;
		address: string;
	};
	branch: {
		id: string;
		name: string;
		BranchCode: string;
		address: string;
		phone: string;
		contactPerson: string;
	};
	fiscalYearId: string;
	fiscalYearName: string;
	billingDate: string;
	paidAt?: string;
	periodStart: string;
	periodEnd: string;
	billingMonths: number;
	items: Array<{
		feeHeadId: string;
		title: string;
		billingEntityId: string;
		billingEntity: string;
		ruleId: string | null;
		amount: number;
	}>;
	subtotal: number;
	discount: number;
	total: number;
	paymentMethod: string;
	note: string;
};

export type BillResourcePayload = Omit<BillResourceContent, 'fiscalYearName'>;

export type CreateBillInput = {
	vehicle: BillingVehicle;
	createdBy?: NonNullable<BillResourceContent['createdBy']>;
	details: BillDetails;
	items: BillingLine[];
	subtotal: number;
	discount: number;
	paymentMethod: string;
	note: string;
};

export type SavedBill = {
	id: string;
	receiptNumber: string;
	createdAt: string;
	content: BillResourceContent;
};
