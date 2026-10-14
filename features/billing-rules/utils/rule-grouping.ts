import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingRule, BillingRuleConfig, Frequency, RuleStatus, Scope } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

export type BillingRuleSortColumn = 'feeHead' | 'vehicleType' | 'amount' | 'frequency' | 'period' | 'validity' | 'status';

export interface BillingRuleFilters {
  search: string;
  fiscalYearId: string;
  feeHeadId: string;
  vehicleCategoryId: string;
  billingEntityId: string;
  frequency: Frequency | 'all';
  status: RuleStatus | 'all';
  scope: Scope;
}

export interface BillingRuleSort {
  column: BillingRuleSortColumn;
  direction: 'asc' | 'desc' | null;
}

export function groupVehicleTypeRules(rules: BillingRule[]): BillingRule[][] {
  const groups = new Map<string, BillingRule[]>();
  for (const rule of rules) {
    const key = JSON.stringify([rule.vehicleCategoryId, rule.fiscalYearId]);
    const group = groups.get(key);
    if (group) group.push(rule);
    else groups.set(key, [rule]);
  }
  return Array.from(groups.values());
}

const collator = new Intl.Collator('ne-NP', { numeric: true, sensitivity: 'base' });

export function filterBillingRules(
  rules: BillingRule[],
  config: BillingRuleConfig,
  filters: BillingRuleFilters,
  vehicleCategories: VehicleTypeRecord[] = [],
  billingEntities: BillingEntityRecord[] = [],
): BillingRule[] {
  const feeHeads = new Map(config.feeHeads.map((feeHead) => [feeHead.id, feeHead]));
  const fiscalYears = new Map(config.fiscalYears.map((year) => [year.id, year]));
  const categories = new Map(vehicleCategories.map((category) => [category.id, category]));
  const entities = new Map(billingEntities.map((entity) => [entity.id, entity]));
  const search = filters.search.trim().toLocaleLowerCase('ne-NP');

  return rules.filter((rule) => {
    if (rule.scope !== filters.scope) return false;
    if (filters.fiscalYearId !== 'all' && rule.fiscalYearId !== filters.fiscalYearId) return false;
    if (filters.feeHeadId !== 'all' && rule.feeHeadId !== filters.feeHeadId) return false;
    if (filters.vehicleCategoryId !== 'all' && rule.vehicleCategoryId !== filters.vehicleCategoryId) return false;
    if (filters.billingEntityId !== 'all' && rule.billingEntityId !== filters.billingEntityId) return false;
    if (filters.frequency !== 'all' && rule.frequency !== filters.frequency) return false;
    if (filters.status !== 'all' && rule.status !== filters.status) return false;
    if (!search) return true;

    const feeHead = feeHeads.get(rule.feeHeadId);
    const fiscalYear = fiscalYears.get(rule.fiscalYearId);
    const values = [
      rule.id,
      feeHead?.name,
      categories.get(rule.vehicleCategoryId ?? '')?.category,
      rule.vehicleCategoryId,
      entities.get(rule.billingEntityId ?? '')?.entity,
      fiscalYear?.name,
      rule.scope,
      rule.frequency,
      rule.period,
      rule.validity,
      rule.status,
      String(rule.amount),
    ];

    return values.some((value) => value?.toLocaleLowerCase('ne-NP').includes(search));
  });
}

export function sortBillingRules(
  rules: BillingRule[],
  config: BillingRuleConfig,
  sort: BillingRuleSort,
  vehicleCategories: VehicleTypeRecord[] = [],
): BillingRule[] {
  if (!sort.direction) return rules;

  const feeHeads = new Map(config.feeHeads.map((feeHead) => [feeHead.id, feeHead.name]));
  const categories = new Map(vehicleCategories.map((category) => [category.id, category.category]));
  const getValue = (rule: BillingRule): string | number => {
    switch (sort.column) {
      case 'feeHead': return feeHeads.get(rule.feeHeadId) ?? rule.feeHeadId;
      case 'vehicleType': return categories.get(rule.vehicleCategoryId ?? '') ?? rule.vehicleCategoryId ?? '';
      case 'amount': return rule.amount;
      case 'frequency': return rule.frequency;
      case 'period': return rule.period ?? '';
      case 'validity': return rule.validity;
      case 'status': return rule.status;
    }
  };

  return [...rules].sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);
    const result = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : collator.compare(String(leftValue), String(rightValue));
    return sort.direction === 'asc' ? result : -result;
  });
}