import {
	asSettingRecord,
	fetchGroupedSettingsDocument,
	findGroupedSettingRecord,
	getSettingResourceId,
	parseSettingJson,
	updateGroupedSettingsSection,
	type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';
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

function parseLegacySettings(value: JsonRecord): FiscalYearSelectorSettings | null {
	const content = asSettingRecord(parseSettingJson(value.inner_content ?? value.innerContent));
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

export async function fetchFiscalYearSelectorSettings(): Promise<FiscalYearSelectorSettingsDocument> {
	const grouped = await fetchGroupedSettingsDocument();
	if (findGroupedSettingRecord(grouped.rawRecords)) {
		return {
			resourceId: grouped.resourceId,
			settings: validateSettings(grouped.settings.fiscalYear.selector),
		};
	}

	const matches = grouped.rawRecords
		.map((value) => ({ resourceId: getSettingResourceId(value), settings: parseLegacySettings(value) }))
		.filter((value): value is { resourceId: string | null; settings: FiscalYearSelectorSettings } => value.settings !== null);
	if (matches.length > 1) throw new Error('Multiple fiscal year selector settings are configured.');
	return matches[0] ?? { resourceId: null, settings: DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS };
}

export async function saveFiscalYearSelectorSettings(
	settings: FiscalYearSelectorSettings,
	current: FiscalYearSelectorSettingsDocument,
): Promise<FiscalYearSelectorSettingsDocument> {
	const validatedSettings = validateSettings(settings);
	const saved = await updateGroupedSettingsSection(
		(grouped) => ({
			...grouped,
			fiscalYear: {
				...grouped.fiscalYear,
				selector: validatedSettings,
			},
		}),
		{ resourceIdHint: current.resourceId },
	);
	return { resourceId: saved.resourceId, settings: validatedSettings };
}
