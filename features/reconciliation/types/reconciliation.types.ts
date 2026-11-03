import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';

export type ReconciliationOption = 'KEEP_BILLING' | 'UPDATE_TQMS' | 'CREATE_NEW_MEMBER';

export type ReconciliationFieldDiff = {
	key: string;
	label: string;
	billingValue: string;
	tqmsValue: string;
	isChanged: boolean;
};

export type ReconciliationAuditEntry = {
	action: ReconciliationOption;
	timestamp: string;
	performedBy: string;
	reason: string;
	changedFields: Array<{
		field: string;
		label: string;
		oldValue: string;
		newValue: string;
	}>;
};

export type VehicleOwnershipHistoryEntry = {
	previousOwners: unknown;
	transferredAt: string;
	performedBy: string;
	reason: string;
	transferType: string;
};

export type ResolvedVehicleOwners = {
	sawariDhaniName: string;
	sanchalakName: string;
	phone: string;
	ownerAddress: string;
	branch: string;
	owners: Array<Record<string, unknown>>;
};

export type ReconciliationLookupResult =
	| {
			type: 'FIRST_TIME';
			tqmsVehicle: BillingVehicle;
			billingVehicle: null;
			billingResource: null;
			diffs: ReconciliationFieldDiff[];
	  }
	| {
			type: 'MATCHED';
			billingVehicle: BillingVehicle;
			tqmsVehicle: BillingVehicle | null;
			billingResource: VehicleResourceDocument;
			diffs: ReconciliationFieldDiff[];
	  }
	| {
			type: 'RECONCILIATION_REQUIRED';
			billingVehicle: BillingVehicle;
			tqmsVehicle: BillingVehicle;
			billingResource: VehicleResourceDocument;
			diffs: ReconciliationFieldDiff[];
	  };

export type ReconciliationDecisionInput = {
	option: ReconciliationOption;
	reason: string;
	performedBy: string;
};

