import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

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

type ResourceRecord = Record<string, unknown>;

function asRecord(value: unknown): ResourceRecord | null {
	return value && typeof value === 'object' && !Array.isArray(value) ? value as ResourceRecord : null;
}

function parseJson(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return value;
	}
}

function rows(value: unknown): ResourceRecord[] {
	const parsed = parseJson(value);
	if (Array.isArray(parsed)) {
		return parsed.map(asRecord).filter((item): item is ResourceRecord => Boolean(item));
	}
	const record = asRecord(parsed);
	if (!record) throw new Error('Could not read receipt cancellation settings.');
	for (const key of ['data', 'items', 'results']) {
		if (record[key] !== undefined) return rows(record[key]);
	}
	throw new Error('Could not read receipt cancellation settings.');
}

function isMissingSettingError(error: unknown): boolean {
	return error instanceof Error && /^Request failed \(404\)/u.test(error.message);
}

function parseDocument(value: ResourceRecord): ReceiptCancelWindowDocument | null {
	const content = asRecord(parseJson(value.inner_content));
	if (content?.key !== 'receipt-cancel-window') return null;
	const hours = Number(content.hours);
	if (typeof content.enabled !== 'boolean' || !Number.isFinite(hours) || hours <= 0) {
		throw new Error('Saved receipt cancellation settings are invalid.');
	}
	const id = value.id ?? value.resourceId ?? value.resource_id;
	if (typeof id !== 'string' && typeof id !== 'number') {
		throw new Error('Saved receipt cancellation settings are missing their resource ID.');
	}
	return {
		resourceId: String(id),
		policy: { enabled: content.enabled, hours },
	};
}

export async function fetchReceiptCancelWindow(): Promise<ReceiptCancelWindowDocument> {
	let values: unknown;
	try {
		values = await apiClient.get<unknown>(endpoints.resources.setting.list());
	} catch (error) {
		if (isMissingSettingError(error)) {
			return { resourceId: null, policy: DEFAULT_RECEIPT_CANCEL_WINDOW };
		}
		throw error;
	}
	const documents = rows(values).map(parseDocument).filter((item): item is ReceiptCancelWindowDocument => Boolean(item));
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
	const request = {
		resource_name: 'SettingResource',
		inner_content: { key: 'receipt-cancel-window', enabled: policy.enabled, hours: policy.hours },
		external_content: null,
	};
	if (current.resourceId) {
		const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
		await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), {
			...request,
			id,
		});
		return { ...current, policy };
	}
	const created = asRecord(await apiClient.post<unknown>(endpoints.resources.setting.create(), request));
	const id = created?.id ?? created?.resourceId ?? created?.resource_id;
	if (typeof id !== 'string' && typeof id !== 'number') {
		throw new Error('The created receipt cancellation setting did not return a resource ID.');
	}
	return { resourceId: String(id), policy };
}
