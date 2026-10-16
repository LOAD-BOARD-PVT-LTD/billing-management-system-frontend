import { getFiscalYearBsRange } from '../../utils/nepali-calender-dates/nepali-fiscal-year';
import { getDaysInBikramSambatMonth, parseBikramSambatDate } from '../../utils/nepali-calender-dates/nepali-date';

const MIN_BILLING_MONTHS = 1;
const MAX_BILLING_MONTHS = 24;

export type ReceiptPeriodEndStrategy = 'MATCH_START_DAY' | 'END_OF_MONTH' | 'FISCAL_YEAR_END';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizeBsDate(value: string): string {
  return value.trim().replace(/\//g, '-');
}

function normalizeReceiptPeriodEndStrategy(value: unknown): ReceiptPeriodEndStrategy | null {
  if (value === 'END_OF_MONTH' || value === 'MATCH_START_DAY' || value === 'FISCAL_YEAR_END') {
    return value;
  }
  return null;
}

export function isFiscalYearEndPeriodStrategy(
  strategy: ReceiptPeriodEndStrategy | null | undefined,
): boolean {
  return strategy === 'FISCAL_YEAR_END';
}

export function resolveFiscalYearEndPeriodToDateBs(
  selectedFiscalYear: string | null | undefined,
): string | null {
  if (!selectedFiscalYear) return null;
  return getFiscalYearBsRange(selectedFiscalYear)?.toBs ?? null;
}

export function clampBillingMonths(value: number): number {
  if (!Number.isFinite(value)) return MIN_BILLING_MONTHS;
  const parsed = Math.trunc(value);
  if (parsed < MIN_BILLING_MONTHS) return MIN_BILLING_MONTHS;
  if (parsed > MAX_BILLING_MONTHS) return MAX_BILLING_MONTHS;
  return parsed;
}

export function deriveBillingMonthsFromRange(periodFromBs: string, periodToBs: string): number {
  const from = parseBikramSambatDate(normalizeBsDate(periodFromBs));
  const to = parseBikramSambatDate(normalizeBsDate(periodToBs));
  if (!from || !to) return MIN_BILLING_MONTHS;
  const months = (to.year - from.year) * 12 + (to.month - from.month) + 1;
  return clampBillingMonths(months);
}

export function resolveEffectiveReceiptBillingMonths(input: {
  requestedBillingMonths: number;
  hasExplicitBillingMonths: boolean;
  periodFromBs: string;
  periodToBs: string;
}): number {
  if (input.hasExplicitBillingMonths) {
    return clampBillingMonths(input.requestedBillingMonths);
  }

  return deriveBillingMonthsFromRange(input.periodFromBs, input.periodToBs);
}

export function resolveReceiptPeriodEndStrategy(
  strategies: Array<ReceiptPeriodEndStrategy | null | undefined>,
): ReceiptPeriodEndStrategy {
  const normalized = strategies
    .map((strategy) => normalizeReceiptPeriodEndStrategy(strategy))
    .filter((strategy): strategy is ReceiptPeriodEndStrategy => strategy != null);

  if (normalized.length === 0) {
    return 'MATCH_START_DAY';
  }

  if (normalized.includes('FISCAL_YEAR_END')) {
    return 'FISCAL_YEAR_END';
  }

  const unique = new Set(normalized);
  if (unique.size === 1) {
    return normalized[0] ?? 'MATCH_START_DAY';
  }

  return 'MATCH_START_DAY';
}

export function resolveEffectiveReceiptPeriodEndStrategy(input: {
  hasFiscalYearEndStrategy: boolean;
  recurringStrategies: Array<ReceiptPeriodEndStrategy | null | undefined>;
}): ReceiptPeriodEndStrategy {
  if (input.recurringStrategies.length > 0) {
    return resolveReceiptPeriodEndStrategy(input.recurringStrategies);
  }

  return input.hasFiscalYearEndStrategy ? 'FISCAL_YEAR_END' : 'MATCH_START_DAY';
}

export function shouldEnforceFiscalYearEndPeriodToBs(
  items: Array<{ pricingMode?: string | null; periodEndStrategy?: string | null }>,
): boolean {
  const hasFiscalYearEndStrategy = items.some((item) => item.periodEndStrategy === 'FISCAL_YEAR_END');
  if (!hasFiscalYearEndStrategy) return false;

  const hasRecurringStrategy = items.some((item) => item.pricingMode === 'MONTHLY_RECURRING');
  return !hasRecurringStrategy;
}

export function shouldResetManualReceiptPeriodToForRecurringSelection(input: {
  hasRecurringRule: boolean;
  periodToDateManuallyEdited: boolean;
  periodFromBs: string;
  periodToBs: string;
}): boolean {
  if (!input.hasRecurringRule || !input.periodToDateManuallyEdited) return false;

  const periodFromBs = normalizeBsDate(input.periodFromBs);
  const periodToBs = normalizeBsDate(input.periodToBs);
  if (!periodFromBs || !periodToBs) return false;

  return periodToBs === periodFromBs;
}

export function resolveReceiptAutoPeriodToDateBs(input: {
  periodFromBs: string;
  billingMonths: number;
  periodEndStrategy: ReceiptPeriodEndStrategy;
  hasRecurringRule: boolean;
  advanceMatchStartDay: boolean;
  periodToDateManuallyEdited: boolean;
  currentPeriodToBs: string;
  selectedFiscalYear?: string | null;
}): string {
  if (input.periodToDateManuallyEdited) {
    return normalizeBsDate(input.currentPeriodToBs);
  }

  if (input.periodEndStrategy === 'FISCAL_YEAR_END') {
    return resolveFiscalYearEndPeriodToDateBs(input.selectedFiscalYear) ?? '';
  }

  const normalizedFrom = normalizeBsDate(input.periodFromBs);
  if (!normalizedFrom) {
    return '';
  }

  if (!input.hasRecurringRule) {
    return normalizedFrom;
  }

  return derivePeriodToDateBs(
    normalizedFrom,
    input.billingMonths,
    input.periodEndStrategy,
    { advanceMatchStartDay: input.advanceMatchStartDay },
  );
}

export function derivePeriodToDateBs(
  periodFromBs: string,
  billingMonths: number,
  periodEndStrategy: ReceiptPeriodEndStrategy = 'MATCH_START_DAY',
  options: { advanceMatchStartDay?: boolean } = {},
): string {
  const normalizedFrom = normalizeBsDate(periodFromBs);
  if (!normalizedFrom) return '';

  const from = parseBikramSambatDate(normalizedFrom);
  if (!from) return normalizedFrom;

  if (periodEndStrategy === 'FISCAL_YEAR_END') {
    return normalizedFrom;
  }

  const monthSpan = clampBillingMonths(billingMonths);
  const monthOffset = monthSpan - 1 + (periodEndStrategy === 'MATCH_START_DAY' && options.advanceMatchStartDay ? 1 : 0);
  const monthIndex = from.year * 12 + (from.month - 1) + monthOffset;
  const year = Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  const maxDay = getDaysInBikramSambatMonth(year, month);
  const day = periodEndStrategy === 'END_OF_MONTH' ? maxDay : Math.min(from.day, maxDay);

  return `${year}-${pad2(month)}-${pad2(day)}`;
}
