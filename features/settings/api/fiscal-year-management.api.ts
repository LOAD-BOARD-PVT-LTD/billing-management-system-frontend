import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { listBillingRuleResources } from '@/features/billing-rules/api/billingRuleResource';
import type { FiscalYear } from '@/features/billing-rules/model/types';

export interface FiscalYearManagementDocument {
	resourceId: string | null;
	fiscalYears: FiscalYear[];
}

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
	if (!record) throw new Error('Could not read fiscal year settings.');
	for (const key of ['data', 'items', 'results']) {
		if (record[key] !== undefined) return rows(record[key]);
	}
	throw new Error('Could not read fiscal year settings.');
}

function getResourceId(value: ResourceRecord): string | null {
	for (const [key, id] of Object.entries(value)) {
		if (!['id', 'resourceid', 'resource_id', 'settingid', 'setting_id'].includes(key.toLocaleLowerCase())) continue;
		if (typeof id === 'string' || typeof id === 'number') {
			const normalized = String(id).trim();
			if (normalized) return normalized;
		}
	}
	return null;
}

function getNestedResourceId(value: unknown): string | null {
	const parsed = parseJson(value);
	if (Array.isArray(parsed)) return parsed.length ? getNestedResourceId(parsed[0]) : null;
	const record = asRecord(parsed);
	if (!record) return null;
	const id = getResourceId(record);
	if (id) return id;
	for (const key of ['data', 'result', 'resource', 'record', 'setting']) {
		const nested = getNestedResourceId(record[key]);
		if (nested) return nested;
	}
	return null;
}

function parseFiscalYear(value: unknown): FiscalYear {
	const record = asRecord(value);
	if (!record) throw new Error('Saved fiscal year settings contain an invalid year.');
	const id = record.id;
	const name = record.name;
	const startDate = record.startDate ?? record.start_date;
	const endDate = record.endDate ?? record.end_date;
	const status = record.status;
	if (
		(typeof id !== 'string' && typeof id !== 'number')
		|| typeof name !== 'string' || !name.trim()
		|| typeof startDate !== 'string' || !startDate
		|| typeof endDate !== 'string' || !endDate
		|| (status !== 'ACTIVE' && status !== 'INACTIVE')
	) {
		throw new Error('Saved fiscal year settings contain an invalid year.');
	}
	return {
		id: String(id),
		code: typeof record.code === 'string' ? record.code : undefined,
		name: name.trim(),
		startDate,
		endDate,
		status,
		isDefault: status === 'ACTIVE',
	};
}

function validateFiscalYears(fiscalYears: FiscalYear[]): FiscalYear[] {
	const activeYears = fiscalYears.filter((year) => year.status === 'ACTIVE');
	if (activeYears.length > 1) throw new Error('एक पटकमा एउटा मात्र आर्थिक वर्ष सक्रिय हुन सक्छ।');
	const ids = new Set<string>();
	const names = new Set<string>();
	const ordered = [...fiscalYears].sort((left, right) => left.startDate.localeCompare(right.startDate));
	for (let index = 0; index < ordered.length; index += 1) {
		const year = ordered[index];
		const normalizedName = year.name.trim().toLocaleLowerCase();
		if (!year.id.trim() || ids.has(year.id)) throw new Error('आर्थिक वर्षको ID अद्वितीय हुनुपर्छ।');
		if (!normalizedName || names.has(normalizedName)) throw new Error(`आर्थिक वर्ष "${year.name}" पहिले नै छ।`);
		if (!isValidDate(year.startDate) || !isValidDate(year.endDate)
			|| year.startDate > year.endDate) {
			throw new Error(`आर्थिक वर्ष "${year.name}" को मिति सीमा अमान्य छ।`);
		}
		if (index > 0 && ordered[index - 1].endDate >= year.startDate) {
			throw new Error(`आर्थिक वर्ष "${year.name}" को मिति अर्को आर्थिक वर्षसँग जुध्छ।`);
		}
		ids.add(year.id);
		names.add(normalizedName);
	}
	return fiscalYears.map((year) => ({ ...year, isDefault: year.status === 'ACTIVE' }));
}

function isValidDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function legacyFiscalYears(years: FiscalYear[]): FiscalYear[] {
	const activeYears = years.filter((year) => year.status === 'ACTIVE');
	if (activeYears.length <= 1) return validateFiscalYears(years);
	const selected = activeYears.find((year) => year.isDefault) ?? activeYears[0];
	return validateFiscalYears(years.map((year) => ({
		...year,
		status: year.id === selected.id ? 'ACTIVE' : 'INACTIVE',
		isDefault: year.id === selected.id,
	})));
}

function settingDocument(value: ResourceRecord): FiscalYearManagementDocument | null {
	const content = asRecord(parseJson(value.inner_content));
	if (content?.key !== 'fiscal-year-management') return null;
	if (!Array.isArray(content.fiscalYears)) throw new Error('Saved fiscal year settings are invalid.');
	const resourceId = getNestedResourceId(value);
	if (!resourceId) throw new Error('Saved fiscal year settings are missing their resource ID.');
	return {
		resourceId,
		fiscalYears: validateFiscalYears(content.fiscalYears.map(parseFiscalYear)),
	};
}

function isMissingSettingError(error: unknown): boolean {
	return error instanceof Error && /^Request failed \(404\)/u.test(error.message);
}

async function readFiscalYearSetting(): Promise<FiscalYearManagementDocument | null> {
	let payload: unknown;
	try {
		payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
	} catch (error) {
		if (isMissingSettingError(error)) return null;
		throw error;
	}
	const matches = rows(payload)
		.map(settingDocument)
		.filter((item): item is FiscalYearManagementDocument => item !== null);
	if (matches.length > 1) throw new Error('Multiple fiscal year management settings are configured.');
	return matches[0] ?? null;
}

export async function fetchFiscalYearManagement(
	legacyYears?: FiscalYear[],
): Promise<FiscalYearManagementDocument> {
	const saved = await readFiscalYearSetting();
	if (saved) return saved;
	const legacyYearsValue = legacyYears ?? (await listBillingRuleResources()).flatMap(({ config }) => config.fiscalYears);
	return {
		resourceId: null,
		fiscalYears: legacyFiscalYears(legacyYearsValue),
	};
}

export async function saveFiscalYearManagement(
	fiscalYears: FiscalYear[],
	current: FiscalYearManagementDocument,
): Promise<FiscalYearManagementDocument> {
	const validatedYears = validateFiscalYears(fiscalYears);
	const request = {
		resource_name: 'SettingResource',
		inner_content: {
			key: 'fiscal-year-management',
			fiscalYears: validatedYears.map((year) => ({
				id: year.id,
				code: year.code,
				name: year.name,
				startDate: year.startDate,
				endDate: year.endDate,
				status: year.status,
			})),
		},
		external_content: null,
	};
	if (current.resourceId) {
		const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
		await apiClient.put<void>(endpoints.resources.setting.update(current.resourceId), { ...request, id });
		return { resourceId: current.resourceId, fiscalYears: validatedYears };
	}
	const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
	const resourceId = getNestedResourceId(created);
	if (!resourceId) throw new Error('The created fiscal year setting did not return a resource ID.');
	return { resourceId, fiscalYears: validatedYears };
}

export async function deleteFiscalYear(
	id: string,
	current: FiscalYearManagementDocument,
): Promise<FiscalYearManagementDocument> {
	const year = current.fiscalYears.find((item) => item.id === id);
	if (!year) throw new Error('आर्थिक वर्ष भेटिएन। पृष्ठ पुनः लोड गरेर फेरि प्रयास गर्नुहोस्।');
	if (year.status === 'ACTIVE') throw new Error('सक्रिय आर्थिक वर्ष हटाउनुअघि अर्को वर्ष सक्रिय गर्नुहोस्।');
	const [billingResources, billResources] = await Promise.all([
		listBillingRuleResources(),
		apiClient.get<unknown>(endpoints.resources.bill.list()),
	]);
	const referencedByRules = billingResources.some(({ config }) =>
		config.rules.some((rule) => rule.fiscalYearId === id)
		|| config.feeHeads.some((feeHead) => feeHead.fiscalYearId === id),
	);
	const referencedByReceipts = rows(billResources).some((resource) => {
		const content = asRecord(parseJson(resource.inner_content));
		const fiscalYear = asRecord(parseJson(content?.fiscalYear));
		return String(content?.fiscalYearId ?? fiscalYear?.id ?? '') === id;
	});
	if (referencedByRules || referencedByReceipts) {
		throw new Error('यो आर्थिक वर्ष बिलिङ नियम वा रसिदमा प्रयोग भएकोले हटाउन मिल्दैन। यसलाई अभिलेख गर्नुहोस्।');
	}
	return saveFiscalYearManagement(current.fiscalYears.filter((item) => item.id !== id), current);
}
