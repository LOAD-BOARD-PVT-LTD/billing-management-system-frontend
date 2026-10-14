export type BillingVehicle = {
	id: string;
	tqmsVehicleId: string;
	tqmsVehicleTypeId: string;
	vehicleNumber: string;
	vehicleType: string;
	ownerName: string;
	phone: string;
	smsPhone: string;
	ownerAddress: string;
	branch: string;
	fiscalYear: string;
	billingDate: string;
	periodStart: string;
	periodEnd: string;
	billingMonths: number;
	company: string;
	companyShare: string;
	rate: string;
	rateDate: string;
	previousPeriod: string;
	remainingPeriod: string;
	resourceContent: Record<string, unknown>;
};

export type BillingLine = {
	id: string;
	title: string;
	amount: number;
	entity: string;
	feeHeadId?: string;
	entityId?: string;
	ruleId?: string;
	isManual?: boolean;
};
