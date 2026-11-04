import { useState, useCallback } from 'react';
import type { BillingVehicle } from '@/features/billing/model/types';
import {
	updateVehicleResource,
	type VehicleResourceDocument,
} from '@/features/billing/api/vehicle-resource.api';
import type {
	ReconciliationFieldDiff,
	ReconciliationLookupResult,
	ReconciliationOption,
	OwnerChangeType,
} from '../types/reconciliation.types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import {
	prepareNewMemberPayload,
	prepareOwnerChangePayload,
	prepareTqmsUpdatePayload,
	reconcileVehicleLookup,
} from '../utils/reconciliation-helpers';

export type ReconcileLookupOptions = {
	signal?: AbortSignal;
	preloadedTqms?: BillingVehicle;
	fallbackSmsPhone?: string;
	receipts?: ReceiptRecord[];
};

export type ApplyDecisionOptions = {
	option: ReconciliationOption | null;
	ownerChangeType: OwnerChangeType | null;
	reason: string;
	performedBy: string;
	billingVehicle: BillingVehicle;
	tqmsVehicle: BillingVehicle;
	billingResource: VehicleResourceDocument;
	diffs: ReconciliationFieldDiff[];
};

export function useVehicleReconciliation() {
	const [isReconciling, setIsReconciling] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reconcileLookup = useCallback(
		async (
			vehicleNumber: string,
			options?: ReconcileLookupOptions,
		): Promise<ReconciliationLookupResult> => {
			setIsReconciling(true);
			setError(null);
			try {
				return await reconcileVehicleLookup(vehicleNumber, options);
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'सवारी खोज तथा प्रमाणीकरणमा समस्या आयो।';
				setError(msg);
				throw err;
			} finally {
				setIsReconciling(false);
			}
		},
		[],
	);

	const applyDecision = useCallback(
		async ({
			option,
			ownerChangeType,
			reason,
			performedBy,
			billingVehicle,
			tqmsVehicle,
			billingResource,
			diffs,
		}: ApplyDecisionOptions): Promise<BillingVehicle> => {
			setIsApplying(true);
			setError(null);

			try {
				if ((option === null || option === 'KEEP_BILLING') && !ownerChangeType) {
					return billingVehicle;
				}

				if (option === null || option === 'KEEP_BILLING') {
					if (!ownerChangeType) return billingVehicle;
					const { innerContent, externalContent } = prepareOwnerChangePayload(
						billingResource,
						tqmsVehicle,
						diffs,
						ownerChangeType,
						performedBy,
						reason,
					);
					await updateVehicleResource(billingResource, innerContent, externalContent);
					return {
						...billingVehicle,
						ownerName: tqmsVehicle.ownerName,
						operatorName: tqmsVehicle.operatorName,
						phone: tqmsVehicle.phone,
						ownerAddress: tqmsVehicle.ownerAddress,
						branch: tqmsVehicle.branch,
						resourceContent: {
							...billingVehicle.resourceContent,
							Owners: tqmsVehicle.resourceContent.Owners ?? tqmsVehicle.resourceContent.owners,
						},
					};
				}

				if (option === 'UPDATE_TQMS') {
					const { innerContent, externalContent } = prepareTqmsUpdatePayload(
						billingResource,
						tqmsVehicle,
						diffs,
						performedBy,
						reason,
						ownerChangeType,
					);
					await updateVehicleResource(billingResource, innerContent, externalContent);
					const ownersApplied = ownerChangeType !== null;
					return {
						...tqmsVehicle,
						...(ownersApplied ? {} : {
							ownerName: billingVehicle.ownerName,
							operatorName: billingVehicle.operatorName,
							phone: billingVehicle.phone,
							ownerAddress: billingVehicle.ownerAddress,
							resourceContent: {
								...tqmsVehicle.resourceContent,
								Owners: billingVehicle.resourceContent.Owners ?? billingVehicle.resourceContent.owners,
							},
						}),
						id: billingResource.id,
						smsPhone: billingVehicle.smsPhone || tqmsVehicle.smsPhone,
					};
				}

				if (option === 'CREATE_NEW_MEMBER') {
					const { innerContent, externalContent } = prepareNewMemberPayload(
						billingResource,
						tqmsVehicle,
						diffs,
						performedBy,
						reason,
					);
					await updateVehicleResource(billingResource, innerContent, externalContent);

					return {
						...tqmsVehicle,
						id: billingResource.id,
						smsPhone: tqmsVehicle.smsPhone || billingVehicle.smsPhone,
					};
				}

				throw new Error('अमान्य विकल्प चयन गरियो।');
			} catch (err) {
				const msg = err instanceof Error ? err.message : 'निर्णय सुरक्षित गर्न सकिएन।';
				setError(msg);
				throw err;
			} finally {
				setIsApplying(false);
			}
		},
		[],
	);

	return {
		reconcileLookup,
		applyDecision,
		isReconciling,
		isApplying,
		error,
	};
}
