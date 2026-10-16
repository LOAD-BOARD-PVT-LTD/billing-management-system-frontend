import type { ReceiptPeriodEndStrategy } from '../../lib/receipts/period';
import type { ReceiptPricingMode } from '../../lib/receipts/pricing-mode';

type RuleAmountReconcileInput = {
  currentAmount: string;
  computedAmount: string;
  resolvedRuleId: string;
  currentRuleId: string;
  allowManualAmountOverride: boolean;
  isAmountManuallyOverridden: boolean;
};

type RuleAmountReconcileResult = {
  amount: string;
  isAmountManuallyOverridden: boolean;
};

type RuleAmountOverrideResetRow = {
  source: string;
  ruleRef?: unknown | null;
  isAmountManuallyOverridden?: boolean;
};

export type RuleLineItemInput = {
  kind: string;
  label: string;
  ruleType?: string | null;
  vehicleCategory?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  pricingMode?: ReceiptPricingMode | null;
  periodEndStrategy?: ReceiptPeriodEndStrategy | null;
  note?: string | null;
  requestedAmountOverride?: number | null;
};

function normalizeLineLabel(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/gu, ' ');
}

export function toPrintableVehicleRuleLabel(item: RuleLineItemInput): string {
  if (normalizeLineLabel(item.ruleType) !== 'VEHICLE_FEE') return item.label;

  const label = normalizeLineLabel(item.label);
  const vehicleCategory = normalizeLineLabel(item.vehicleCategory);
  if (!vehicleCategory) return item.label;

  const prefix = `${vehicleCategory} - `;
  if (!label.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase())) return item.label;

  return normalizeLineLabel(label.slice(prefix.length)) || item.label;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toNonNegativeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function resetRuleAmountOverridesForBillingMonthChange<
  TRow extends RuleAmountOverrideResetRow,
>(
  rows: TRow[],
  currentBillingMonths: number,
  nextBillingMonths: number,
): TRow[] {
  if (currentBillingMonths === nextBillingMonths) return rows;
  let changed = false;
  const nextRows = rows.map((row) => {
    if (row.source !== 'RULE' || !row.ruleRef || !row.isAmountManuallyOverridden) return row;
    changed = true;
    return { ...row, isAmountManuallyOverridden: false };
  });
  return changed ? nextRows : rows;
}

export function reconcileRuleRowAmount(input: RuleAmountReconcileInput): RuleAmountReconcileResult {
  const computedAmount = input.computedAmount;
  const ruleChanged = input.currentRuleId.trim() !== input.resolvedRuleId.trim();
  const currentAmount = input.currentAmount.trim();

  if (!input.allowManualAmountOverride || ruleChanged) {
    return { amount: computedAmount, isAmountManuallyOverridden: false };
  }

  if (!input.isAmountManuallyOverridden) {
    return { amount: computedAmount, isAmountManuallyOverridden: false };
  }

  if (currentAmount === '') {
    return { amount: '', isAmountManuallyOverridden: true };
  }

  const manualAmount = toNonNegativeNumber(currentAmount);
  if (manualAmount === null) {
    return { amount: computedAmount, isAmountManuallyOverridden: false };
  }

  return { amount: String(manualAmount), isAmountManuallyOverridden: true };
}

export function buildRequestedRuleLineItem(
  item: RuleLineItemInput,
): RuleLineItemInput {
  const label = toPrintableVehicleRuleLabel(item);
  const lineItem = { ...item };
  delete lineItem.ruleType;
  delete lineItem.vehicleCategory;
  const overrideAmount = toNonNegativeNumber(item.requestedAmountOverride);
  if (overrideAmount === null) return { ...lineItem, label };

  const quantity = toPositiveNumber(item.quantity) ?? 1;
  return {
    ...lineItem,
    label,
    amount: overrideAmount,
    rate: overrideAmount / quantity,
    requestedAmountOverride: undefined,
  };
}
