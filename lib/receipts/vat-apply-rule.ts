import { normalizeBillingEntityKey } from '@/lib/receipts/billing-entities';

type VatConfigLike = {
  enabled?: unknown;
  rate?: unknown;
};

export function resolveVatRatePct(config: VatConfigLike | null | undefined): number {
  const rate = Number(config?.rate);
  if (!Number.isFinite(rate)) return 0;
  return Math.min(Math.max(rate, 0), 100);
}

export function buildVatEnabledEntityKeys(entityNames: readonly string[]): Set<string> {
  const keys = new Set<string>();
  for (const entityName of entityNames) {
    const key = normalizeBillingEntityKey(entityName);
    if (!key) continue;
    keys.add(key);
  }
  return keys;
}

export function shouldApplyVatToEntity(params: {
  billingEntity: string | null | undefined;
  vatRatePct: number;
  vatEnabledEntityKeys: ReadonlySet<string>;
  mainBillingEntity?: string | null | undefined;
}): boolean {
  if (params.vatRatePct <= 0) return false;
  const billingEntityKey = normalizeBillingEntityKey(params.billingEntity);
  if (!billingEntityKey) return false;

  return params.vatEnabledEntityKeys.has(billingEntityKey);
}

export function calculateVatAmount(taxableAmount: number, vatRatePct: number): number {
  if (!Number.isFinite(taxableAmount) || taxableAmount <= 0) return 0;
  if (!Number.isFinite(vatRatePct) || vatRatePct <= 0) return 0;
  return Math.round((taxableAmount * vatRatePct) / 100);
}
