import {
  canonicalizeFiscalYearLabel,
  createBillingRuleFeeHead,
  createBillingRuleResource,
  deleteBillingRuleResource,
  listBillingRuleResources,
  updateBillingRuleFeeHead,
  updateBillingRuleResource,
  type BillingRuleResourceDocument,
} from '@/features/billing-rules/api/billingRuleResource';
import type { BillingRule, BillingRuleConfig, FiscalYear } from '@/features/billing-rules/model/types';
import {
  fetchFiscalYearManagement,
  type FiscalYearManagementDocument,
} from '@/features/settings/api/fiscal-year-management.api';
import {
  asSettingRecord,
  parseSettingJson,
} from '@/features/settings/api/grouped-settings.api';
import { assertUniqueFeeHeadNames } from '@/features/billing-rules/utils/fee-head-name-validation';
import { assertNoCrossScopeFeeHeadRules } from '@/features/billing-rules/schemas/billingRuleSchema';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import {
  formatNepaliFiscalYearLabel,
  getFiscalYearInputDateRange,
  getNepaliFiscalYear,
  parseFiscalYear,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';

function deriveFiscalYearFromDateString(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim().replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
  const match = /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/u.exec(trimmed);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 32) {
    return null;
  }
  if (year >= 2050) {
    return formatNepaliFiscalYearLabel(month >= 4 ? year : year - 1);
  }
  if (year >= 1990) {
    const adDate = new Date(Date.UTC(year, month - 1, day, 6, 0, 0));
    if (!Number.isNaN(adDate.getTime())) {
      return getNepaliFiscalYear(adDate);
    }
  }
  return null;
}

function buildLegacyFiscalYearIdMap(
  mergedConfig: BillingRuleConfig,
  settings: FiscalYearManagementDocument,
): Map<string, string> {
  const idMap = new Map<string, string>();
  const register = (rawId: unknown, rawLabel: unknown) => {
    if (typeof rawId !== 'string' && typeof rawId !== 'number') return;
    const id = String(rawId).trim();
    if (!id || canonicalizeFiscalYearLabel(id) || idMap.has(id)) return;
    const label = canonicalizeFiscalYearLabel(rawLabel);
    if (label) idMap.set(id, label);
  };

  for (const record of settings.rawSettingRecords) {
    const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
    if (content?.key !== 'fiscal-year-management' || !Array.isArray(content.fiscalYears)) continue;
    for (const item of content.fiscalYears) {
      const fy = asSettingRecord(item);
      if (fy) register(fy.id, fy.code ?? fy.name);
    }
  }

  for (const year of mergedConfig.fiscalYears) {
    register(year.id, year.code ?? year.name);
  }

  const monthlyPaid = settings.groupedSettings.arrears.monthlyPaid;
  if (monthlyPaid.billingRuleId) {
    const rule = mergedConfig.rules.find((item) => item.id === monthlyPaid.billingRuleId);
    if (rule) register(rule.fiscalYearId, monthlyPaid.fiscalYearId);
  }

  const feeHeadsById = new Map(mergedConfig.feeHeads.map((feeHead) => [feeHead.id, feeHead]));
  for (const linkedRule of settings.groupedSettings.linkedFeeRules.rules) {
    for (const fhId of [linkedRule.sourceFeeHeadId, linkedRule.linkedFeeHeadId]) {
      const fh = feeHeadsById.get(fhId);
      if (fh?.fiscalYearId) register(fh.fiscalYearId, linkedRule.fiscalYearId);
    }
  }

  for (const rule of mergedConfig.rules) {
    if (canonicalizeFiscalYearLabel(rule.fiscalYearId) || idMap.has(rule.fiscalYearId)) continue;
    const derivedLabel = deriveFiscalYearFromDateString(rule.effectiveDate);
    if (derivedLabel) register(rule.fiscalYearId, derivedLabel);
  }

  return idMap;
}

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
      feeHeads: sortFeeHeadsByDisplayOrder(Array.from(feeHeads.values())),
      fiscalYears: Array.from(fiscalYears.values()),
      rules: Array.from(rules.values()),
    },
  };
}

export const billingRulesApi = {
  async list(): Promise<BillingRuleResourceDocument> {
    const [resources, settings] = await Promise.all([
      listBillingRuleResources(),
      fetchFiscalYearManagement(),
    ]);
    const merged = mergeDocuments(resources);
    const legacyFiscalYearIdMap = buildLegacyFiscalYearIdMap(merged.config, settings);
    const resolveFiscalYearId = (id: string): string => (
      canonicalizeFiscalYearLabel(id) ?? legacyFiscalYearIdMap.get(id) ?? id
    );

    const feeHeads = merged.config.feeHeads.map((feeHead) => (
      feeHead.fiscalYearId
        ? { ...feeHead, fiscalYearId: resolveFiscalYearId(feeHead.fiscalYearId) }
        : feeHead
    ));
    const rules = merged.config.rules.map((rule) => ({
      ...rule,
      fiscalYearId: resolveFiscalYearId(rule.fiscalYearId),
    }));

    const fiscalYearsById = new Map<string, FiscalYear>(
      settings.fiscalYears.map((year) => [year.id, year]),
    );
    const legacyMergedById = new Map(merged.config.fiscalYears.map((year) => [year.id, year]));
    const referencedFiscalYearIds = new Set<string>([
      ...rules.map((rule) => rule.fiscalYearId),
      ...feeHeads.flatMap((feeHead) => (feeHead.fiscalYearId ? [feeHead.fiscalYearId] : [])),
    ]);

    for (const fyId of referencedFiscalYearIds) {
      if (fiscalYearsById.has(fyId)) continue;
      const label = canonicalizeFiscalYearLabel(fyId);
      if (label) {
        const range = getFiscalYearInputDateRange(label);
        fiscalYearsById.set(label, {
          id: label,
          code: label,
          name: label,
          startDate: range?.from ?? '',
          endDate: range?.to ?? '',
          status: 'INACTIVE',
          isDefault: false,
        });
        continue;
      }
      const existing = legacyMergedById.get(fyId);
      fiscalYearsById.set(fyId, {
        id: fyId,
        ...(existing?.code ? { code: existing.code } : {}),
        name: existing?.name || fyId,
        startDate: existing?.startDate ?? '',
        endDate: existing?.endDate ?? '',
        status: 'INACTIVE',
        isDefault: false,
      });
    }

    const fiscalYears = Array.from(fiscalYearsById.values()).sort((left, right) => {
      const leftYear = parseFiscalYear(left.code ?? left.name);
      const rightYear = parseFiscalYear(right.code ?? right.name);
      if (leftYear !== null && rightYear !== null) return rightYear - leftYear;
      if (leftYear !== null) return -1;
      if (rightYear !== null) return 1;
      return left.name.localeCompare(right.name);
    });

    return {
      ...merged,
      config: {
        ...merged.config,
        feeHeads,
        fiscalYears,
        rules,
      },
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
    assertUniqueFeeHeadNames(config.feeHeads, previousConfig.feeHeads);
    assertNoCrossScopeFeeHeadRules(config);

    const fiscalYearIdentityByAlias = new Map<string, string>();
    for (const year of config.fiscalYears) {
      const identity = canonicalizeFiscalYearLabel(year.code)
        ?? canonicalizeFiscalYearLabel(year.name)
        ?? canonicalizeFiscalYearLabel(year.id)
        ?? year.id;
      for (const alias of [year.id, year.code, year.name, identity]) {
        if (alias) fiscalYearIdentityByAlias.set(String(alias).trim(), identity);
      }
    }
    const resolveFiscalYearIdentity = (value: string | null): string => {
      if (!value) return '';
      const trimmed = String(value).trim();
      return fiscalYearIdentityByAlias.get(trimmed)
        ?? canonicalizeFiscalYearLabel(trimmed)
        ?? trimmed;
    };

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
      const savedFeeHead = {
        ...(document.config.feeHeads[0] ?? feeHead),
        displayOrder: document.config.feeHeads[0]?.displayOrder ?? feeHead.displayOrder,
        fiscalYearId: feeHead.fiscalYearId,
      };
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
      if (feeHead?.fiscalYearId
        && resolveFiscalYearIdentity(feeHead.fiscalYearId) !== resolveFiscalYearIdentity(rule.fiscalYearId)) {
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

    const savedRuleIds = new Set(savedConfig.rules.map((rule) => rule.id));
    for (const rule of previousConfig.rules) {
      if (!savedRuleIds.has(rule.id)) {
        await deleteBillingRuleResource(rule.id);
      }
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
