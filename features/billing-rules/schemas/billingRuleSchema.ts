import { z } from 'zod';

import type { BillingRule, BillingRuleConfig } from '@/features/billing-rules/model/types';
import { getPeriodForFrequency, getValidityForFrequency, validityOptionsByFrequency } from '@/features/billing-rules/utils/rule-period-policy';

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
  if (!validityOptionsByFrequency[rule.frequency].some((option) => option.value === rule.validity)) {
    context.addIssue({
      code: 'custom',
      message: rule.frequency === 'ONE_TIME'
        ? 'एकपटक शुल्कका लागि सोही दिन वा आर्थिक वर्षको अन्त्य चयन गर्नुहोस्।'
        : 'आवधिक शुल्कका लागि अर्को महिनाको सोही दिन वा महिनाको अन्त्य चयन गर्नुहोस्।',
      path: ['validity'],
    });
  }
  const normalizedValidity = getValidityForFrequency(rule.frequency, rule.validity);
  if (rule.period !== getPeriodForFrequency(rule.frequency, normalizedValidity)) {
    context.addIssue({
      code: 'custom',
      message: 'शुल्कको अवधि आवृत्ति र मान्य अवधि अन्त्यसँग मिल्नुपर्छ।',
      path: ['period'],
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
  if (!validityOptionsByFrequency[rule.frequency].some((option) => option.value === rule.validity)) {
    errors.validity = rule.frequency === 'ONE_TIME'
      ? 'एकपटक शुल्कका लागि सोही दिन वा आर्थिक वर्षको अन्त्य चयन गर्नुहोस्।'
      : 'आवधिक शुल्कका लागि अर्को महिनाको सोही दिन वा महिनाको अन्त्य चयन गर्नुहोस्।';
  }
  const normalizedValidity = getValidityForFrequency(rule.frequency, rule.validity);
  if (rule.period !== getPeriodForFrequency(rule.frequency, normalizedValidity)) {
    errors.period = 'शुल्कको अवधि आवृत्ति र मान्य अवधि अन्त्यसँग मिल्नुपर्छ।';
  }
  if (rule.amount < 0) errors.amount = 'रकम शून्य वा सोभन्दा बढी हुनुपर्छ।';

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

export function findCrossScopeFeeHeadRule(rules: BillingRule[], candidate: BillingRule): BillingRule | null {
  if (candidate.status !== 'ACTIVE') return null;
  return rules.find((rule) =>
    rule.id !== candidate.id
    && rule.status === 'ACTIVE'
    && rule.feeHeadId === candidate.feeHeadId
    && rule.fiscalYearId === candidate.fiscalYearId
    && rule.scope !== candidate.scope,
  ) ?? null;
}

export function assertNoCrossScopeFeeHeadRules(config: BillingRuleConfig): void {
  const feeHeadNames = new Map(config.feeHeads.map((feeHead) => [feeHead.id, feeHead.name]));
  for (const rule of config.rules) {
    if (!findCrossScopeFeeHeadRule(config.rules, rule)) continue;
    const feeHeadName = feeHeadNames.get(rule.feeHeadId) ?? rule.feeHeadId;
    throw new Error(`"${feeHeadName}" शुल्क शीर्षकलाई Common र Vehicle Type दुवै Billing Rule मा प्रयोग गर्न मिल्दैन।`);
  }
}

export function validateBillingRuleConfig(config: BillingRuleConfig): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const feeHeadNames = new Map(config.feeHeads.map((feeHead) => [feeHead.id, feeHead.name]));

  for (const rule of config.rules) {
    const validation = validateBillingRuleRecord(rule);
    if (!validation.isValid) {
      errors[rule.id] = Object.values(validation.errors).join(' ');
      continue;
    }

    if (findCrossScopeFeeHeadRule(config.rules, rule)) {
      const feeHeadName = feeHeadNames.get(rule.feeHeadId) ?? rule.feeHeadId;
      errors[rule.id] = `"${feeHeadName}" शुल्क शीर्षकलाई Common र Vehicle Type दुवै Billing Rule मा प्रयोग गर्न मिल्दैन।`;
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
