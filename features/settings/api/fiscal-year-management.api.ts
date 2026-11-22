import type { FiscalYear } from '@/features/billing-rules/model/types';
import {
	fetchGroupedSettingsDocument,
	updateGroupedSettingsSection,
	type BillingFiscalYearAccessSettings,
	type BillingFiscalYearAccessStatus,
	type BillingFiscalYearControlEntry,
	type GroupedSettingsContent,
	type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';
import {
	DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS,
	type FiscalYearSelectorSettings,
} from '@/features/settings/api/fiscal-year-selector.api';
import {
	formatNepaliFiscalYearLabel,
	generateNepaliFiscalYearOptions,
	getFiscalYearInputDateRange,
	getNepaliFiscalYear,
	parseFiscalYear,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export type BillingFiscalYearControlTarget = 'previousYear' | 'nextYear';

export interface FiscalYearManagementDocument {
	resourceId: string | null;
	currentFiscalYear: string;
	previousYearControl: BillingFiscalYearControlEntry;
	nextYearControl: BillingFiscalYearControlEntry;
	billingFiscalYears: FiscalYear[];
	fiscalYears: FiscalYear[];
	groupedSettings: GroupedSettingsContent;
	rawSettingRecords: JsonRecord[];
}

function normalizeLabel(value: string): string {
	const parsed = parseFiscalYear(value);
	return parsed !== null ? formatNepaliFiscalYearLabel(parsed) : value.trim();
}

export function getAdjacentFiscalYears(baseDate: Date = new Date()): {
	previousFiscalYear: string;
	currentFiscalYear: string;
	nextFiscalYear: string;
} {
	const currentFiscalYear = getNepaliFiscalYear(baseDate);
	const startYear = parseFiscalYear(currentFiscalYear);
	if (startYear === null) {
		throw new Error(`Invalid Nepali fiscal year derived from calendar: ${currentFiscalYear}`);
	}
	return {
		previousFiscalYear: formatNepaliFiscalYearLabel(startYear - 1),
		currentFiscalYear,
		nextFiscalYear: formatNepaliFiscalYearLabel(startYear + 1),
	};
}

export function resolveBillingFiscalYearControls(
	billingAccess?: BillingFiscalYearAccessSettings,
	baseDate: Date = new Date(),
): {
	currentFiscalYear: string;
	previousYearControl: BillingFiscalYearControlEntry;
	nextYearControl: BillingFiscalYearControlEntry;
} {
	const { previousFiscalYear, currentFiscalYear, nextFiscalYear } = getAdjacentFiscalYears(baseDate);
	const storedPrevious = billingAccess?.previousYear;
	const storedNext = billingAccess?.nextYear;

	const previousYearControl: BillingFiscalYearControlEntry = (
		storedPrevious && normalizeLabel(storedPrevious.fiscalYear) === previousFiscalYear
	)
		? { ...storedPrevious, fiscalYear: previousFiscalYear }
		: { fiscalYear: previousFiscalYear, status: 'CLOSED', updatedAt: null, updatedBy: null };

	const nextYearControl: BillingFiscalYearControlEntry = (
		storedNext && normalizeLabel(storedNext.fiscalYear) === nextFiscalYear
	)
		? { ...storedNext, fiscalYear: nextFiscalYear }
		: { fiscalYear: nextFiscalYear, status: 'CLOSED', updatedAt: null, updatedBy: null };

	return {
		currentFiscalYear,
		previousYearControl,
		nextYearControl,
	};
}

export function deriveCalendarFiscalYears(options?: {
	baseDate?: Date;
	selector?: FiscalYearSelectorSettings;
	billingAccess?: BillingFiscalYearAccessSettings;
}): FiscalYear[] {
	const baseDate = options?.baseDate ?? new Date();
	const selector = options?.selector ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;
	const {
		currentFiscalYear,
		previousYearControl,
		nextYearControl,
	} = resolveBillingFiscalYearControls(options?.billingAccess, baseDate);

	const generated = generateNepaliFiscalYearOptions({
		baseDate,
		yearsBack: selector.yearsBack,
		yearsForward: selector.yearsForward,
		archivedYears: selector.archivedYears,
	});

	const labelSet = new Set<string>([
		nextYearControl.fiscalYear,
		currentFiscalYear,
		previousYearControl.fiscalYear,
		...generated.map(normalizeLabel),
	]);
	const sortedLabels = Array.from(labelSet).sort((left, right) => {
		const leftYear = parseFiscalYear(left) ?? 0;
		const rightYear = parseFiscalYear(right) ?? 0;
		return rightYear - leftYear;
	});

	const openBillingSet = new Set<string>([
		currentFiscalYear,
		...(previousYearControl.status === 'OPEN' ? [previousYearControl.fiscalYear] : []),
		...(nextYearControl.status === 'OPEN' ? [nextYearControl.fiscalYear] : []),
	]);

	return sortedLabels
		.map((label): FiscalYear | null => {
			const range = getFiscalYearInputDateRange(label);
			if (!range) return null;
			return {
				id: label,
				code: label,
				name: label,
				startDate: range.from,
				endDate: range.to,
				status: openBillingSet.has(label) ? 'ACTIVE' : 'INACTIVE',
				isDefault: label === currentFiscalYear,
			};
		})
		.filter((year): year is FiscalYear => year !== null);
}

function buildFiscalYearDocument(
	resourceId: string | null,
	settings: GroupedSettingsContent,
	rawSettingRecords: JsonRecord[],
	baseDate: Date,
): FiscalYearManagementDocument {
	const {
		currentFiscalYear,
		previousYearControl,
		nextYearControl,
	} = resolveBillingFiscalYearControls(settings.fiscalYear.billingAccess, baseDate);
	const fiscalYears = deriveCalendarFiscalYears({
		baseDate,
		selector: settings.fiscalYear.selector,
		billingAccess: settings.fiscalYear.billingAccess,
	});
	const billingFiscalYears = fiscalYears.filter((year) => year.status === 'ACTIVE');

	return {
		resourceId,
		currentFiscalYear,
		previousYearControl,
		nextYearControl,
		billingFiscalYears,
		fiscalYears,
		groupedSettings: settings,
		rawSettingRecords,
	};
}

export async function fetchFiscalYearManagement(
	baseDate: Date = new Date(),
): Promise<FiscalYearManagementDocument> {
	const grouped = await fetchGroupedSettingsDocument();
	return buildFiscalYearDocument(
		grouped.resourceId,
		grouped.settings,
		grouped.rawRecords,
		baseDate,
	);
}

export async function updateBillingFiscalYearAccess(
	target: BillingFiscalYearControlTarget,
	status: BillingFiscalYearAccessStatus,
	performedBy: string,
	current: FiscalYearManagementDocument,
	baseDate: Date = new Date(),
	now: Date = new Date(),
): Promise<FiscalYearManagementDocument> {
	const { previousFiscalYear, nextFiscalYear } = getAdjacentFiscalYears(baseDate);
	const targetFiscalYear = target === 'previousYear' ? previousFiscalYear : nextFiscalYear;
	const nextEntry: BillingFiscalYearControlEntry = {
		fiscalYear: targetFiscalYear,
		status,
		updatedAt: now.toISOString(),
		updatedBy: performedBy.trim() || 'System Administrator',
	};

	const saved = await updateGroupedSettingsSection(
		(grouped) => ({
			...grouped,
			fiscalYear: {
				...grouped.fiscalYear,
				billingAccess: {
					...grouped.fiscalYear.billingAccess,
					[target]: nextEntry,
				},
			},
		}),
		{ resourceIdHint: current.resourceId },
	);

	return buildFiscalYearDocument(
		saved.resourceId,
		saved.settings,
		current.rawSettingRecords,
		baseDate,
	);
}
