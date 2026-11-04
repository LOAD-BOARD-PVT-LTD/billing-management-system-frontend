'use client';

import { useState } from 'react';
import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type {
	ReconciliationFieldDiff,
	ReconciliationOption,
	OwnerChangeType,
} from '../types/reconciliation.types';
import { ReconciliationActions } from './ReconciliationActions';
import { ReconciliationComparisonTable } from './ReconciliationComparisonTable';
import { ReconciliationDecisionOptions } from './ReconciliationDecisionOptions';
import { ReconciliationReasonField } from './ReconciliationReasonField';
import { ReconciliationValidationMessage } from './ReconciliationValidationMessage';
import { hasReconciliationHistory, ReconciliationMemberHistory } from './ReconciliationMemberHistory';
import { VehicleReconciliationHeader } from './VehicleReconciliationHeader';
import { VehicleReconciliationWarning } from './VehicleReconciliationWarning';
import { OwnerChangeDecision } from './OwnerChangeDecision';
import { isOwnerReconciliationDiff } from '../utils/reconciliation-helpers';

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
	onConfirm: (option: ReconciliationOption | null, ownerChangeType: OwnerChangeType | null, reason: string) => Promise<void> | void;
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
	const [ownerChangeType, setOwnerChangeType] = useState<OwnerChangeType | null>(null);
	const [isOwnerDecisionOpen, setIsOwnerDecisionOpen] = useState(true);
	const [validationError, setValidationError] = useState<string | null>(null);

	const ownerDiffs = diffs.filter(isOwnerReconciliationDiff);
	const changedOwnerDetails = ownerDiffs.some((diff) => diff.isChanged);
	const vehicleDiffs = diffs.filter((diff) => !isOwnerReconciliationDiff(diff));
	const changedVehicleDetails = vehicleDiffs.some((diff) => diff.isChanged);
	const changedDiffs = diffs.filter((diff) => diff.isChanged);
	const showHistory = hasReconciliationHistory(billingVehicle, billingResource, receipts, tqmsVehicle);
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
		if (changedVehicleDetails && !selectedOption) {
			setValidationError('सवारी विवरणका लागि अगाडि बढ्ने विकल्प छान्नुहोस्।');
			return;
		}

		if (changedOwnerDetails && !ownerChangeType) {
			setValidationError('धनी विवरणको परिवर्तन प्रकार छान्नुहोस्।');
			return;
		}

		if (selectedOption === 'UPDATE_TQMS' && reason.trim().length < 3) {
			setValidationError('विवरण अद्यावधिक गर्नका लागि कम्तीमा ३ अक्षरको कारण वा कैफियत उल्लेख गर्नुपर्छ।');
			return;
		}

		setValidationError(null);
		await onConfirm(
			selectedOption,
			ownerChangeType,
			reason.trim() || (ownerChangeType === 'OWNERSHIP_TRANSFER'
				? 'TQMS अनुसार धनी परिवर्तन पुष्टि'
				: ownerChangeType === 'NAME_CORRECTION' ? 'TQMS अनुसार धनीको नाम सच्याइयो' : ''),
		);
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
			{vehicleDiffs.some((diff) => !showHistory || diff.isChanged) ? (
				<ReconciliationComparisonTable diffs={vehicleDiffs} showChangedOnly={!showHistory} />
			) : null}
			{changedVehicleDetails ? (
				<ReconciliationDecisionOptions
					selectedOption={selectedOption}
					onSelect={handleSelectOption}
				/>
			) : null}
			{selectedOption === 'UPDATE_TQMS' && (
				<ReconciliationReasonField reason={reason} onReasonChange={handleReasonChange} />
			)}
			<ReconciliationValidationMessage message={validationError} />
			{changedVehicleDetails ? (
				<ReconciliationActions
					isSubmitting={isSubmitting}
					canConfirm={Boolean(selectedOption && (!changedOwnerDetails || ownerChangeType))}
					onCancel={onCancel}
					onConfirm={() => void handleSubmit()}
				/>
			) : null}
			{changedOwnerDetails && !changedVehicleDetails && isSubmitting ? (
				<p role="status" className="text-center text-sm text-muted-foreground">धनीको निर्णय सुरक्षित हुँदैछ...</p>
			) : null}
			{changedOwnerDetails && isOwnerDecisionOpen ? (
				<OwnerChangeDecision
					billingVehicle={billingVehicle}
					tqmsVehicle={tqmsVehicle}
					value={ownerChangeType}
					onChange={(value) => {
						setOwnerChangeType(value);
						setValidationError(null);
					}}
					onCancel={onCancel}
					onSave={() => {
						if (!ownerChangeType) return;
						setIsOwnerDecisionOpen(false);
						if (!changedVehicleDetails) {
							void onConfirm(
								null,
								ownerChangeType,
								ownerChangeType === 'OWNERSHIP_TRANSFER'
									? 'TQMS अनुसार धनी परिवर्तन पुष्टि'
									: 'TQMS अनुसार धनीको नाम सच्याइयो',
							);
						}
					}}
				/>
			) : null}
		</div>
	);
}
