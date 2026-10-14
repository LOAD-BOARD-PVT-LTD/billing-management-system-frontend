import { apiClient } from '@/lib/api/client';
import {
	formatNepaliFiscalYearLabel,
	parseFiscalYear,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export interface FiscalYearSelectorSettings {
	yearsBack: number;
	yearsForward: number;
	archivedYears: string[];
}

export interface FiscalYearSelectorSettingsDocument {
	resourceId: string | null;
	settings: FiscalYearSelectorSettings;
}

export const DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS: FiscalYearSelectorSettings = {
	yearsBack: 4,
	yearsForward: 1,
	archivedYears: [],
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
	if (!record) throw new Error('Could not read fiscal year selector settings.');
	for (const key of ['data', 'items', 'results']) {
		if (record[key] !== undefined) return rows(record[key]);
	}
	throw new Error('Could not read fiscal year selector settings.');
}

function isMissingSettingError(error: unknown): boolean {
	return error instanceof Error && /^Request failed \(404\)/u.test(error.message);
}

function parseSettings(value: ResourceRecord): FiscalYearSelectorSettings | null {
	const content = asRecord(parseJson(value.inner_content));
	if (content?.key !== 'fiscal-year-selector') return null;
	const yearsBack = Number(content.yearsBack);
	const yearsForward = Number(content.yearsForward);
	if (!Number.isInteger(yearsBack) || !Number.isInteger(yearsForward) || !Array.isArray(content.archivedYears)) {
		throw new Error('Saved fiscal year selector settings are invalid.');
	}
	const archivedYears = content.archivedYears.filter((year): year is string => typeof year === 'string');
	if (archivedYears.length !== content.archivedYears.length) {
		throw new Error('Saved archived fiscal years are invalid.');
	}
	return validateSettings({ yearsBack, yearsForward, archivedYears });
}

function getResourceId(value: ResourceRecord): string | null {
	const id = value.id ?? value.resourceId ?? value.resource_id;
	return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function toWesternDigits(value: string): string {
	return value.replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
}

function normalizeFiscalYear(value: string): string | null {
	const normalized = toWesternDigits(value.trim());
	const match = /^(\d{4})\/(\d{2})$/u.exec(normalized);
	if (!match) return null;
	const startYear = parseFiscalYear(normalized);
	if (startYear === null || Number(match[2]) !== (startYear + 1) % 100) return null;
	return formatNepaliFiscalYearLabel(startYear);
}

function validateSettings(settings: FiscalYearSelectorSettings): FiscalYearSelectorSettings {
	if (!Number.isInteger(settings.yearsBack) || settings.yearsBack < 0 || settings.yearsBack > 20) {
		throw new Error('पछाडि वर्ष ० देखि २० सम्म हुनुपर्छ।');
	}
	if (!Number.isInteger(settings.yearsForward) || settings.yearsForward < 0 || settings.yearsForward > 10) {
		throw new Error('अगाडि वर्ष ० देखि १० सम्म हुनुपर्छ।');
	}
	const archivedYears: string[] = [];
	for (const rawYear of settings.archivedYears) {
		const year = normalizeFiscalYear(rawYear);
		if (!year) throw new Error(`अवैध आर्थिक वर्ष: ${rawYear}`);
		if (!archivedYears.includes(year)) archivedYears.push(year);
	}
	return { yearsBack: settings.yearsBack, yearsForward: settings.yearsForward, archivedYears };
}

export async function fetchFiscalYearSelectorSettings(): Promise<FiscalYearSelectorSettingsDocument> {
	let payload: unknown;
	try {
		payload = await apiClient.get<unknown>('read/SettingResource/all');
	} catch (error) {
		if (isMissingSettingError(error)) {
			return { resourceId: null, settings: DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS };
		}
		throw error;
	}
	const matches = rows(payload)
		.map((value) => ({ resourceId: getResourceId(value), settings: parseSettings(value) }))
		.filter((value): value is { resourceId: string | null; settings: FiscalYearSelectorSettings } => value.settings !== null);
	if (matches.length > 1) throw new Error('Multiple fiscal year selector settings are configured.');
	return matches[0] ?? { resourceId: null, settings: DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS };
}

export async function saveFiscalYearSelectorSettings(
	settings: FiscalYearSelectorSettings,
	current: FiscalYearSelectorSettingsDocument,
): Promise<FiscalYearSelectorSettingsDocument> {
	const validatedSettings = validateSettings(settings);

	const request = {
		resource_name: 'SettingResource',
		inner_content: {
			key: 'fiscal-year-selector',
			yearsBack: validatedSettings.yearsBack,
			yearsForward: validatedSettings.yearsForward,
			archivedYears: validatedSettings.archivedYears,
		},
		external_content: null,
	};
	if (current.resourceId) {
		const id = /^\d+$/u.test(current.resourceId) ? Number(current.resourceId) : current.resourceId;
		await apiClient.put<void>(`update/SettingResource/${encodeURIComponent(current.resourceId)}`, { ...request, id });
		return { resourceId: current.resourceId, settings: validatedSettings };
	}

	const created = asRecord(await apiClient.post<unknown>('create/SettingResource', request));
	const resourceId = created ? getResourceId(created) : null;
	if (!resourceId) throw new Error('The created fiscal year selector setting did not return a resource ID.');
	return { resourceId, settings: validatedSettings };
}
