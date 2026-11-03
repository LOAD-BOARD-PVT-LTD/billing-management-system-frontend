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
} from '../types/reconciliation.types';
import {
	prepareNewMemberPayload,
	prepareTqmsUpdatePayload,
	reconcileVehicleLookup,
} from '../utils/reconciliation-helpers';

export type ReconcileLookupOptions = {
	signal?: AbortSignal;
	preloadedTqms?: BillingVehicle;
	fallbackSmsPhone?: string;
};

export type ApplyDecisionOptions = {
	option: ReconciliationOption;
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
				if (option === 'KEEP_BILLING') {
					return billingVehicle;
				}

				if (option === 'UPDATE_TQMS') {
					const { innerContent, externalContent } = prepareTqmsUpdatePayload(
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
