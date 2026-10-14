import { z } from 'zod';

import type { BillingRule, BillingRuleConfig } from '@/features/billing-rules/model/types';

export const feeHeadSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1, 'शुल्क कोड आवश्यक छ।'),
  name: z.string().trim().min(1, 'शुल्क शीर्षक आवश्यक छ।'),
  description: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const fiscalYearSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1, 'आर्थिक वर्ष कोड आवश्यक छ।'),
  name: z.string().trim().min(1, 'आर्थिक वर्ष नाम आवश्यक छ।'),
  startDate: z.string().trim().min(1, 'सुरु मिति आवश्यक छ।'),
  endDate: z.string().trim().min(1, 'अन्त्य मिति आवश्यक छ।'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export const billingRuleSchema = z.object({
  id: z.string().trim().min(1),
  feeHeadId: z.string().trim().min(1, 'शुल्क शीर्षक चयन गर्नुहोस्।'),
  fiscalYearId: z.string().trim().min(1, 'आर्थिक वर्ष चयन गर्नुहोस्।'),
  billingEntityId: z.string().trim().min(1).nullable(),
  scope: z.enum(['COMMON', 'VEHICLE_TYPE']),
  vehicleCategoryId: z.string().trim().nullable().optional(),
  frequency: z.enum(['ONE_TIME', 'PERIODIC']),
  period: z.enum(['FISCAL_YEAR', 'MONTH']).nullable(),
  validity: z.enum(['SAME_DAY', 'END_OF_MONTH', 'END_OF_FISCAL_YEAR']),
  amount: z.number().nonnegative('रकम ० वा सोभन्दा बढी हुनुपर्छ।'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
}).superRefine((rule, context) => {
  if (rule.scope === 'VEHICLE_TYPE' && rule.amount === 0) {
    context.addIssue({
      code: 'custom',
      message: 'सवारी नियमको रकम शून्यभन्दा बढी हुनुपर्छ।',
      path: ['amount'],
    });
  }
});

export const billingRuleConfigSchema = z.object({
  version: z.number().int().nonnegative(),
  feeHeads: z.array(feeHeadSchema),
  fiscalYears: z.array(fiscalYearSchema),
  rules: z.array(billingRuleSchema),
});

export function validateBillingRuleRecord(rule: BillingRule): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!rule.feeHeadId) errors.feeHeadId = 'शुल्क शीर्षक आवश्यक छ।';
  if (!rule.fiscalYearId) errors.fiscalYearId = 'आर्थिक वर्ष आवश्यक छ।';
  if (!rule.billingEntityId) errors.billingEntityId = 'Billing Entity चयन गर्नुहोस्।';
  if (rule.scope === 'VEHICLE_TYPE' && !rule.vehicleCategoryId) {
    errors.vehicleCategoryId = 'सवारी श्रेणी आवश्यक छ।';
  }
  if (rule.scope === 'COMMON' && rule.vehicleCategoryId) {
    errors.vehicleCategoryId = 'COMMON नियममा सवारी श्रेणी राख्न हुँदैन।';
  }
  if (rule.scope === 'COMMON' && rule.frequency === 'ONE_TIME' && rule.period !== null) {
    errors.period = 'साझा एकपटक शुल्कको अवधि लागू हुँदैन।';
  } else if (rule.frequency === 'ONE_TIME' && rule.period !== 'FISCAL_YEAR') {
    errors.period = 'एकपटक शुल्कको अवधि आर्थिक वर्ष हुनुपर्छ।';
  }
  if (rule.frequency === 'PERIODIC' && rule.period !== 'MONTH') {
    errors.period = 'आवधिक शुल्कको अवधि महिना हुनुपर्छ।';
  }
  if (rule.amount < 0 || (rule.scope === 'VEHICLE_TYPE' && rule.amount === 0)) {
    errors.amount = rule.scope === 'COMMON'
      ? 'रकम शून्य वा सोभन्दा बढी हुनुपर्छ।'
      : 'सवारी नियमको रकम शून्यभन्दा बढी हुनुपर्छ।';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function duplicateRuleKey(rule: Pick<BillingRule, 'feeHeadId' | 'fiscalYearId' | 'billingEntityId' | 'scope' | 'vehicleCategoryId' | 'frequency' | 'period' | 'validity'>) {
  return [
    rule.feeHeadId,
    rule.fiscalYearId,
    rule.billingEntityId ?? 'NO_ENTITY',
    rule.scope,
    rule.vehicleCategoryId ?? 'COMMON',
    rule.frequency,
    rule.period,
    rule.validity,
  ].join('|');
}

export function findDuplicateRule(rules: BillingRule[], candidate: BillingRule): BillingRule | null {
  if (candidate.status !== 'ACTIVE') return null;
  const key = duplicateRuleKey(candidate);
  return rules.find((rule) =>
    rule.id !== candidate.id
    && rule.status === 'ACTIVE'
    && duplicateRuleKey(rule) === key,
  ) ?? null;
}

export function validateBillingRuleConfig(config: BillingRuleConfig): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const rule of config.rules) {
    const validation = validateBillingRuleRecord(rule);
    if (!validation.isValid) {
      errors[rule.id] = Object.values(validation.errors).join(' ');
      continue;
    }

    const duplicate = findDuplicateRule(config.rules, rule);
    if (duplicate) {
      errors[rule.id] = `यो नियम पहिले देखि छ: ${duplicate.id}`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
