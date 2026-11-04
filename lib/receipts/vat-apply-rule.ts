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

export function calculateConfiguredVat(params: {
  items: readonly { entityId?: string; billingEntityId?: string; amount: number }[];
  subtotal: number;
  discount: number;
  enabled: boolean;
  rate: number;
  billingEntityIds: readonly string[];
}): { taxableAmount: number; vatAmount: number; vatRatePct: number; billingEntityIds: string[]; vatApplicable: boolean } {
  const vatRatePct = resolveVatRatePct({ rate: params.rate });
  const billingEntityIds = params.enabled && vatRatePct > 0
    ? [...new Set(params.billingEntityIds.map((id) => id.trim()).filter(Boolean))]
    : [];
  const enabledEntityIds = new Set(billingEntityIds);
  const taxableBeforeDiscount = params.enabled
    ? params.items.reduce((total, item) => {
      const entityId = (item.entityId ?? item.billingEntityId ?? '').trim();
      return enabledEntityIds.has(entityId) && Number.isFinite(item.amount) && item.amount > 0
        ? total + item.amount
        : total;
    }, 0)
    : 0;
  const validSubtotal = Number.isFinite(params.subtotal) ? Math.max(0, params.subtotal) : 0;
  const validDiscount = Number.isFinite(params.discount)
    ? Math.min(Math.max(0, params.discount), validSubtotal)
    : 0;
  const discountShare = validSubtotal > 0 ? validDiscount * (taxableBeforeDiscount / validSubtotal) : 0;
  const taxableAmount = Math.max(0, taxableBeforeDiscount - discountShare);

  return {
    taxableAmount,
    vatAmount: calculateVatAmount(taxableAmount, vatRatePct),
    vatRatePct,
    billingEntityIds,
    vatApplicable: taxableBeforeDiscount > 0,
  };
}
