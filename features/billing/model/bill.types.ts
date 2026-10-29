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

export type BillCustomer = {
	name: string;
	phone: string;
	address: string;
	panNumber: string;
};

export type BillingType = 'MEMBERSHIP' | 'GENERAL';

export type BillResourceContent = {
	billingType?: BillingType;
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
	customer?: BillCustomer;
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

export type BillResourcePayload = Omit<BillResourceContent, 'fiscalYearName' | 'vehicle'> & {
	vehicle?: BillResourceContent['vehicle'];
};

type CreateBillBase = {
	createdBy?: NonNullable<BillResourceContent['createdBy']>;
	details: BillDetails;
	items: BillingLine[];
	subtotal: number;
	discount: number;
	paymentMethod: string;
	note: string;
};

export type MembershipBillInput = CreateBillBase & {
	billingType?: 'MEMBERSHIP';
	vehicle: BillingVehicle;
	customer?: never;
};

export type GeneralBillInput = CreateBillBase & {
	billingType: 'GENERAL';
	vehicle?: never;
	customer: BillCustomer;
};

export type CreateBillInput = MembershipBillInput | GeneralBillInput;

export type SavedBill = {
	id: string;
	receiptNumber: string;
	createdAt: string;
	content: BillResourceContent;
};
