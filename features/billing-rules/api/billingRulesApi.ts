import {
  createBillingRuleFeeHead,
  createBillingRuleResource,
  listBillingRuleResources,
  updateBillingRuleFeeHead,
  updateBillingRuleResource,
  type BillingRuleResourceDocument,
} from '@/features/billing-rules/api/billingRuleResource';
import type { BillingRule, BillingRuleConfig } from '@/features/billing-rules/model/types';
import { fetchFiscalYearManagement } from '@/features/settings/api/fiscal-year-management.api';

function mergeDocuments(documents: BillingRuleResourceDocument[]): BillingRuleResourceDocument {
  const feeHeads = new Map<string, BillingRuleConfig['feeHeads'][number]>();
  const fiscalYears = new Map<string, BillingRuleConfig['fiscalYears'][number]>();
  const rules = new Map<string, BillingRule>();

  for (const { config } of documents) {
    if (config.rules.length === 0 && config.feeHeads.length === 0) {
      for (const fiscalYear of config.fiscalYears) fiscalYears.set(fiscalYear.id, fiscalYear);
    }
  }

  for (const { config } of documents) {
    if (config.rules.length === 0) {
      for (const feeHead of config.feeHeads) feeHeads.set(feeHead.id, feeHead);
    }
  }

  for (const { config } of documents) {
    for (const feeHead of config.feeHeads) {
      if (!feeHeads.has(feeHead.id)) feeHeads.set(feeHead.id, feeHead);
    }
    for (const fiscalYear of config.fiscalYears) {
      if (!fiscalYears.has(fiscalYear.id)) fiscalYears.set(fiscalYear.id, fiscalYear);
    }
    for (const rule of config.rules) rules.set(rule.id, rule);
  }

  return {
    resourceId: null,
    config: {
      version: 1,
      feeHeads: Array.from(feeHeads.values()),
      fiscalYears: Array.from(fiscalYears.values()),
      rules: Array.from(rules.values()),
    },
  };
}

export const billingRulesApi = {
  async list(): Promise<BillingRuleResourceDocument> {
    const resources = await listBillingRuleResources();
    const merged = mergeDocuments(resources);
    const settings = await fetchFiscalYearManagement(merged.config.fiscalYears);
    return {
      ...merged,
      config: { ...merged.config, fiscalYears: settings.fiscalYears },
    };
  },

  async getById(id: string): Promise<BillingRuleConfig | null> {
    const documents = await listBillingRuleResources();
    const match = documents.find(({ config }) =>
      config.rules.some((rule) => rule.id === id)
      || config.feeHeads.some((feeHead) => feeHead.id === id)
      || config.fiscalYears.some((year) => year.id === id),
    );
    return match?.config ?? null;
  },

  async save(config: BillingRuleConfig, previousConfig: BillingRuleConfig): Promise<BillingRuleResourceDocument> {
    const defaultYears = config.fiscalYears.filter((year) => year.isDefault === true);
    if (defaultYears.length > 1) throw new Error('आर्थिक वर्षमध्ये एउटा मात्र पूर्वनिर्धारित वर्ष छान्नुहोस्।');
    if (defaultYears.some((year) => year.status !== 'ACTIVE')) throw new Error('निष्क्रिय आर्थिक वर्षलाई पूर्वनिर्धारित बनाउन मिल्दैन।');

    const previousFeeHeads = new Map(previousConfig.feeHeads.map((feeHead) => [feeHead.id, feeHead]));
    const feeHeadIdMap = new Map<string, string>();
    const feeHeadNamesChanged = new Set<string>();
    const savedFeeHeads: BillingRuleConfig['feeHeads'] = [];

    for (const feeHead of config.feeHeads) {
      const previousFeeHead = previousFeeHeads.get(feeHead.id);
      if (previousFeeHead
        && JSON.stringify(previousFeeHead) === JSON.stringify(feeHead)) {
        savedFeeHeads.push(feeHead);
        feeHeadIdMap.set(feeHead.id, feeHead.id);
        continue;
      }
      if (!feeHead.fiscalYearId && (!previousFeeHead || previousFeeHead.fiscalYearId !== null)) {
        throw new Error(`"${feeHead.name}" शुल्क शीर्षकको आर्थिक वर्ष छान्नुहोस्।`);
      }
      const document = previousFeeHead
        ? await updateBillingRuleFeeHead(feeHead.id, feeHead)
        : await createBillingRuleFeeHead(feeHead);
      const savedFeeHead = document.config.feeHeads[0] ?? feeHead;
      savedFeeHeads.push(savedFeeHead);
      feeHeadIdMap.set(feeHead.id, savedFeeHead.id);
      if (!previousFeeHead || previousFeeHead.name !== savedFeeHead.name) {
        feeHeadNamesChanged.add(savedFeeHead.id);
      }
    }

    const savedConfig = {
      ...config,
      feeHeads: savedFeeHeads,
      rules: config.rules.map((rule) => ({
        ...rule,
        feeHeadId: feeHeadIdMap.get(rule.feeHeadId) ?? rule.feeHeadId,
      })),
    };
    const savedFeeHeadsById = new Map(savedFeeHeads.map((feeHead) => [feeHead.id, feeHead]));
    for (const rule of savedConfig.rules) {
      const feeHead = savedFeeHeadsById.get(rule.feeHeadId);
      if (feeHead?.fiscalYearId && feeHead.fiscalYearId !== rule.fiscalYearId) {
        throw new Error(`"${feeHead.name}" शुल्क शीर्षक र बिलिङ नियमको आर्थिक वर्ष मिलेन।`);
      }
    }
    const previousRules = new Map(previousConfig.rules.map((rule) => [rule.id, rule]));
    const savedRules: BillingRule[] = [];

    for (const rule of savedConfig.rules) {
      const previousRule = previousRules.get(rule.id);
      if (previousRule
        && JSON.stringify(previousRule) === JSON.stringify(rule)
        && !feeHeadNamesChanged.has(rule.feeHeadId)) {
        savedRules.push(rule);
        continue;
      }
      const document = previousRule
        ? await updateBillingRuleResource(rule.id, savedConfig, rule)
        : await createBillingRuleResource(savedConfig, rule);
      savedRules.push(document.config.rules[0] ?? rule);
    }

    return {
      resourceId: null,
      config: {
        ...savedConfig,
        rules: savedRules,
      },
    };
  },
};
