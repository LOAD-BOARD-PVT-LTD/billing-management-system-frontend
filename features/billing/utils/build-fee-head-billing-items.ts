import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import { getDefaultBillingEntityId } from '@/features/administration/billing-entities/utils/billing-entity-default';
import type { BillingRule, FeeHead } from '@/features/billing-rules/model/types';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import type { BillingLine } from '@/features/billing/model/types';

export function calculateBillingRuleAmount(
  rule: BillingRule,
  billingMonths: number,
): number {
  if (rule.frequency !== 'PERIODIC' || rule.period !== 'MONTH') return rule.amount;
  const months = Number.isFinite(billingMonths)
    ? Math.min(12, Math.max(1, Math.trunc(billingMonths)))
    : 1;
  return rule.amount * months;
}

export function buildFeeHeadBillingItems(
  feeHeads: FeeHead[],
  rules: BillingRule[],
  billingEntities: BillingEntityRecord[],
  itemOverrides: Record<string, Partial<BillingLine>>,
  billingMonths = 1,
): BillingLine[] {
  const defaultBillingEntityId = getDefaultBillingEntityId(billingEntities);
  return sortFeeHeadsByDisplayOrder(feeHeads).flatMap((feeHead): BillingLine[] => {
    const feeHeadRules = rules.filter((rule) => rule.feeHeadId === feeHead.id);
    if (feeHeadRules.length === 0) {
      const id = `unconfigured-${feeHead.id}`;
      return [{
        id,
        title: feeHead.name,
        feeHeadId: feeHead.id,
        amount: 0,
        entity: billingEntities.find((entity) => entity.id === defaultBillingEntityId)?.entity ?? '',
        entityId: defaultBillingEntityId,
        isUnconfigured: true,
        ...itemOverrides[id],
      }];
    }

    return feeHeadRules.map((rule) => ({
      id: rule.id,
      ruleId: rule.id,
      title: feeHead.name,
      feeHeadId: feeHead.id,
      amount: calculateBillingRuleAmount(rule, billingMonths),
      entity: billingEntities.find((entity) => entity.id === (rule.billingEntityId ?? defaultBillingEntityId))?.entity ?? '',
      entityId: rule.billingEntityId ?? defaultBillingEntityId,
      ...itemOverrides[rule.id],
    }));
  });
}
