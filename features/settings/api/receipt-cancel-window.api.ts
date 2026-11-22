import {
	asSettingRecord,
	fetchGroupedSettingsDocument,
	findGroupedSettingRecord,
	getSettingResourceId,
	parseSettingJson,
	updateGroupedSettingsSection,
	type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export interface ReceiptCancelWindow {
	enabled: boolean;
	hours: number;
}

export interface ReceiptCancelWindowDocument {
	resourceId: string | null;
	policy: ReceiptCancelWindow;
}

export const DEFAULT_RECEIPT_CANCEL_WINDOW: ReceiptCancelWindow = {
	enabled: false,
	hours: 24,
};

function parseLegacyDocument(value: JsonRecord): ReceiptCancelWindowDocument | null {
	const content = asSettingRecord(parseSettingJson(value.inner_content ?? value.innerContent));
	if (content?.key !== 'receipt-cancel-window') return null;
	const hours = Number(content.hours);
	if (typeof content.enabled !== 'boolean' || !Number.isFinite(hours) || hours <= 0) {
		throw new Error('Saved receipt cancellation settings are invalid.');
	}
	const id = getSettingResourceId(value);
	if (!id) {
		throw new Error('Saved receipt cancellation settings are missing their resource ID.');
	}
	return {
		resourceId: id,
		policy: { enabled: content.enabled, hours },
	};
}

export async function fetchReceiptCancelWindow(): Promise<ReceiptCancelWindowDocument> {
	const grouped = await fetchGroupedSettingsDocument();
	if (findGroupedSettingRecord(grouped.rawRecords)) {
		return {
			resourceId: grouped.resourceId,
			policy: grouped.settings.receiptCancelWindow,
		};
	}

	const documents = grouped.rawRecords
		.map(parseLegacyDocument)
		.filter((item): item is ReceiptCancelWindowDocument => Boolean(item));
	if (documents.length > 1) throw new Error('Multiple receipt cancellation policies are configured.');
	return documents[0] ?? { resourceId: null, policy: DEFAULT_RECEIPT_CANCEL_WINDOW };
}

export async function saveReceiptCancelWindow(
	policy: ReceiptCancelWindow,
	current: ReceiptCancelWindowDocument,
): Promise<ReceiptCancelWindowDocument> {
	if (!Number.isInteger(policy.hours) || policy.hours <= 0 || policy.hours > 8760) {
		throw new Error('समय सीमा १ देखि ८७६० घण्टासम्म हुनुपर्छ।');
	}
	const saved = await updateGroupedSettingsSection(
		(grouped) => ({ ...grouped, receiptCancelWindow: policy }),
		{ resourceIdHint: current.resourceId },
	);
	return { resourceId: saved.resourceId, policy };
}
