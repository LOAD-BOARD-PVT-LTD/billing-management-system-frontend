import type { BillingRule, BillingRuleConfig, FeeHead, FiscalYear } from '@/features/billing-rules/model/types';

export const EMPTY_BILLING_RULE_CONFIG: BillingRuleConfig = {
  version: 1,
  feeHeads: [],
  fiscalYears: [],
  rules: [],
};

export const createEmptyFeeHead = (): FeeHead => ({
  id: crypto.randomUUID(),
  code: '',
  fiscalYearId: null,
  name: '',
  status: 'ACTIVE',
});

export const createEmptyFiscalYear = (): FiscalYear => ({
  code: '',
  isDefault: false,
  id: crypto.randomUUID(),
  name: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
});

export const createEmptyRule = (): BillingRule => ({
  id: crypto.randomUUID(),
  feeHeadId: '',
  fiscalYearId: '',
  billingEntityId: null,
  scope: 'COMMON',
  vehicleCategoryId: null,
  frequency: 'ONE_TIME',
  period: 'MONTH',
  validity: 'SAME_DAY',
  amount: 0,
  status: 'ACTIVE',
});
