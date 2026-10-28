import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';

export interface LinkedFeeRule {
	id: string;
	fiscalYearId: string;
	sourceFeeHeadId: string;
	linkedFeeHeadId: string;
	active: boolean;
	oncePerFiscalYear: boolean;
}

export interface LinkedFeeRulesSettings {
	enabled: boolean;
	rules: LinkedFeeRule[];
}

export interface LinkedFeeRulesDocument {
	resourceId: string | null;
	settings: LinkedFeeRulesSettings;
}

export const DEFAULT_LINKED_FEE_RULES_SETTINGS: LinkedFeeRulesSettings = {
	enabled: false,
	rules: [],
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
	if (!record) throw new Error('जोडिएको शुल्क नियम पढ्न सकिएन।');
	for (const key of ['data', 'items', 'results']) {
		if (record[key] !== undefined) return rows(record[key]);
	}
	throw new Error('जोडिएको शुल्क नियम पढ्न सकिएन।');
}

function isMissingSettingError(error: unknown): boolean {
	return error instanceof Error && /^Request failed \(404\)/u.test(error.message);
}

function getResourceId(value: ResourceRecord): string | null {
	const id = value.id ?? value.resourceId ?? value.resource_id;
	return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function parseSettings(value: ResourceRecord): LinkedFeeRulesSettings | null {
	const content = asRecord(parseJson(value.inner_content));
	if (content?.key !== 'linked-fee-rules') return null;
	if (typeof content.enabled !== 'boolean' || !Array.isArray(content.rules)) {
		throw new Error('जोडिएको शुल्क नियमको सुरक्षित गरिएको विवरण अमान्य छ।');
	}
	const rules = content.rules.map((value): LinkedFeeRule => {
		const rule = asRecord(value);
		if (!rule
			|| typeof rule.id !== 'string'
			|| typeof rule.fiscalYearId !== 'string'
			|| typeof rule.sourceFeeHeadId !== 'string'
			|| typeof rule.linkedFeeHeadId !== 'string'
			|| typeof rule.active !== 'boolean'
			|| typeof rule.oncePerFiscalYear !== 'boolean') {
			throw new Error('जोडिएको शुल्क नियमको एउटा विवरण अमान्य छ।');
		}
		return {
			id: rule.id,
			fiscalYearId: rule.fiscalYearId,
			sourceFeeHeadId: rule.sourceFeeHeadId,
			linkedFeeHeadId: rule.linkedFeeHeadId,
			active: rule.active,
			oncePerFiscalYear: rule.oncePerFiscalYear,
		};
	});
	validateLinkedFeeRules({ enabled: content.enabled, rules });
	return { enabled: content.enabled, rules };
}

export function validateLinkedFeeRules(settings: LinkedFeeRulesSettings): void {
	const uniquePairs = new Set<string>();
	for (const rule of settings.rules) {
		if (!rule.fiscalYearId || !rule.sourceFeeHeadId || !rule.linkedFeeHeadId) {
			throw new Error('सबै जोडिएको शुल्क नियममा आर्थिक वर्ष र दुवै शुल्क छान्नुहोस्।');
		}
		if (rule.sourceFeeHeadId === rule.linkedFeeHeadId) {
			throw new Error('मुख्य शुल्क र जोडिने शुल्क एउटै हुन मिल्दैन।');
		}
		const pair = `${rule.fiscalYearId}:${rule.sourceFeeHeadId}:${rule.linkedFeeHeadId}`;
		if (uniquePairs.has(pair)) throw new Error('एउटै जोडिएको शुल्क नियम दोहोरिएको छ।');
		uniquePairs.add(pair);
	}
}

export async function fetchLinkedFeeRules(): Promise<LinkedFeeRulesDocument> {
	let payload: unknown;
	try {
		payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
	} catch (error) {
		if (isMissingSettingError(error)) {
			return { resourceId: null, settings: DEFAULT_LINKED_FEE_RULES_SETTINGS };
		}
		throw error;
	}
	const matches = rows(payload).flatMap((value): LinkedFeeRulesDocument[] => {
		const settings = parseSettings(value);
		if (!settings) return [];
		const resourceId = getResourceId(value);
		if (!resourceId) throw new Error('जोडिएको शुल्क नियमको resource ID भेटिएन।');
		return [{ resourceId, settings }];
	});
	if (matches.length > 1) throw new Error('जोडिएको शुल्क नियमका एकभन्दा बढी सेटिङ भेटिए।');
	return matches[0] ?? { resourceId: null, settings: DEFAULT_LINKED_FEE_RULES_SETTINGS };
}

export async function saveLinkedFeeRules(
	settings: LinkedFeeRulesSettings,
	current: LinkedFeeRulesDocument,
): Promise<LinkedFeeRulesDocument> {
	validateLinkedFeeRules(settings);
	const request = {
		resource_name: 'SettingResource',
		inner_content: {
			key: 'linked-fee-rules',
			enabled: settings.enabled,
			rules: settings.rules,
		},
		external_content: null,
	};
	if (current.resourceId) {
		const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
		await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
		return { resourceId: current.resourceId, settings };
	}
	const created = asRecord(await apiClient.post<unknown>(endpoints.resources.setting.create(), request));
	const resourceId = created ? getResourceId(created) : null;
	if (!resourceId) throw new Error('जोडिएको शुल्क नियम सुरक्षित गर्दा resource ID प्राप्त भएन।');
	return { resourceId, settings };
}
