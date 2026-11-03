'use client';

import { useState } from 'react';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type {
	ReconciliationFieldDiff,
	ReconciliationOption,
} from '../types/reconciliation.types';
import { ReconciliationActions } from './ReconciliationActions';
import { ReconciliationComparisonTable } from './ReconciliationComparisonTable';
import { ReconciliationDecisionOptions } from './ReconciliationDecisionOptions';
import { ReconciliationReasonField } from './ReconciliationReasonField';
import { ReconciliationValidationMessage } from './ReconciliationValidationMessage';
import { hasReconciliationHistory, ReconciliationMemberHistory } from './ReconciliationMemberHistory';
import { VehicleReconciliationHeader } from './VehicleReconciliationHeader';
import { VehicleReconciliationWarning } from './VehicleReconciliationWarning';

export type VehicleReconciliationViewProps = {
	billingVehicle: BillingVehicle;
	tqmsVehicle: BillingVehicle;
	billingResource: VehicleResourceDocument;
	diffs: ReconciliationFieldDiff[];
	receipts: ReceiptRecord[];
	isLoadingReceipts: boolean;
	receiptsError: string | null;
	isSubmitting: boolean;
	onCancel: () => void;
	onConfirm: (option: ReconciliationOption, reason: string) => Promise<void> | void;
};

export function VehicleReconciliationView({
	billingVehicle,
	tqmsVehicle,
	billingResource,
	diffs,
	receipts,
	isLoadingReceipts,
	receiptsError,
	isSubmitting,
	onCancel,
	onConfirm,
}: VehicleReconciliationViewProps) {
	const [selectedOption, setSelectedOption] = useState<ReconciliationOption | null>(null);
	const [reason, setReason] = useState('');
	const [validationError, setValidationError] = useState<string | null>(null);

	const changedDiffs = diffs.filter((diff) => diff.isChanged);
	const showHistory = hasReconciliationHistory(billingVehicle, billingResource, receipts);
	const showHistoryStatus = isLoadingReceipts || Boolean(receiptsError);

	const handleSelectOption = (option: ReconciliationOption) => {
		setSelectedOption(option);
		setValidationError(null);
	};

	const handleReasonChange = (nextReason: string) => {
		setReason(nextReason);
		if (validationError) setValidationError(null);
	};

	const handleSubmit = async () => {
		if (!selectedOption) {
			setValidationError('कृपया अगाडि बढ्न ३ वटा विकल्पमध्ये एक छान्नुहोस्।');
			return;
		}

		if (selectedOption !== 'KEEP_BILLING' && reason.trim().length < 3) {
			setValidationError('विवरण अद्यावधिक गर्नका लागि कम्तीमा ३ अक्षरको कारण वा कैफियत उल्लेख गर्नुपर्छ।');
			return;
		}

		setValidationError(null);
		await onConfirm(selectedOption, reason.trim());
	};

	return (
		<div className="mx-auto w-full max-w-5xl space-y-4 py-2">
			<VehicleReconciliationHeader
				vehicleNumber={tqmsVehicle.vehicleNumber || billingVehicle.vehicleNumber}
				changedFieldCount={changedDiffs.length}
				isSubmitting={isSubmitting}
				onCancel={onCancel}
			/>
			<VehicleReconciliationWarning />
			{showHistory || showHistoryStatus ? (
				<ReconciliationMemberHistory
					billingVehicle={billingVehicle}
					tqmsVehicle={tqmsVehicle}
					billingResource={billingResource}
					receipts={receipts}
					isLoading={isLoadingReceipts}
					error={receiptsError}
				/>
			) : null}
			<ReconciliationComparisonTable diffs={diffs} showChangedOnly={!showHistory} />
			<ReconciliationDecisionOptions
				selectedOption={selectedOption}
				onSelect={handleSelectOption}
			/>
			{selectedOption && selectedOption !== 'KEEP_BILLING' && (
				<ReconciliationReasonField reason={reason} onReasonChange={handleReasonChange} />
			)}
			<ReconciliationValidationMessage message={validationError} />
			<ReconciliationActions
				isSubmitting={isSubmitting}
				canConfirm={Boolean(selectedOption)}
				onCancel={onCancel}
				onConfirm={() => void handleSubmit()}
			/>
		</div>
	);
}
