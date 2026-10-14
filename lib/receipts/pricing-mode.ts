export type ReceiptPricingMode = 'MONTHLY_RECURRING' | 'ONE_TIME';

type ReceiptPricingCandidate = {
  kind: string;
  quantity: number;
  pricingMode?: ReceiptPricingMode | null;
};

type ReceiptPricingAmountInput = {
  pricingMode: ReceiptPricingMode;
  quantity: number;
  rate: number;
};

function normalizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.trunc(quantity));
}

function normalizeRate(rate: number): number {
  if (!Number.isFinite(rate)) return 0;
  return Math.max(0, rate);
}

export function resolvePricingMode(
  input: ReceiptPricingCandidate,
): ReceiptPricingMode {
  if (input.pricingMode === 'MONTHLY_RECURRING' || input.pricingMode === 'ONE_TIME') {
    return input.pricingMode;
  }

  const normalizedKind = input.kind.trim().toUpperCase();
  if (normalizedKind === 'BASE') {
    return 'MONTHLY_RECURRING';
  }

  if (normalizeQuantity(input.quantity) > 1) {
    return 'MONTHLY_RECURRING';
  }

  return 'ONE_TIME';
}

export function calculateExtendedAmount(input: ReceiptPricingAmountInput): number {
  const rate = normalizeRate(input.rate);
  if (input.pricingMode === 'MONTHLY_RECURRING') {
    return rate * normalizeQuantity(input.quantity);
  }
  return rate;
}
