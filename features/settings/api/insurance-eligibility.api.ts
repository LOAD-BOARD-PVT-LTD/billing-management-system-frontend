import type { BillingRule, FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import {
  asSettingRecord,
  fetchGroupedSettingsDocument,
  findGroupedSettingRecord,
  getSettingResourceId,
  parseSettingJson,
  updateGroupedSettingsSection,
  type JsonRecord,
} from '@/features/settings/api/grouped-settings.api';

export const INSURANCE_ELIGIBILITY_SETTING_KEY = 'insurance-eligibility';

export interface InsuranceEligibilitySettings {
  enabled: boolean;
  ruleIds: string[];
  minPaidRules: number;
}

export interface InsuranceEligibilityDocument {
  resourceId: string | null;
  settings: InsuranceEligibilitySettings;
}

export const DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS: InsuranceEligibilitySettings = {
  enabled: false,
  ruleIds: [],
  minPaidRules: 1,
};

function normalizeRuleIds(ruleIds: string[]): string[] {
  return [...new Set(ruleIds.map((id) => id.trim()).filter(Boolean))];
}

function parseLegacySetting(record: JsonRecord): InsuranceEligibilityDocument | null {
  const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
  if (content?.key !== INSURANCE_ELIGIBILITY_SETTING_KEY) return null;
  if (
    typeof content.enabled !== 'boolean'
    || !Array.isArray(content.ruleIds)
    || content.ruleIds.some((id) => typeof id !== 'string')
    || typeof content.minPaidRules !== 'number'
    || !Number.isInteger(content.minPaidRules)
    || content.minPaidRules < 1
  ) {
    throw new Error('सुरक्षित गरिएको Insurance eligibility सेटिङ अमान्य छ।');
  }
  const resourceId = getSettingResourceId(record);
  if (!resourceId) throw new Error('Insurance eligibility सेटिङको resource ID भेटिएन।');
  return {
    resourceId,
    settings: {
      enabled: content.enabled,
      ruleIds: normalizeRuleIds(content.ruleIds as string[]),
      minPaidRules: content.minPaidRules,
    },
  };
}

export function validateInsuranceEligibilitySettings(settings: InsuranceEligibilitySettings): InsuranceEligibilitySettings {
  const ruleIds = normalizeRuleIds(settings.ruleIds);
  if (settings.enabled && ruleIds.length === 0) {
    throw new Error('Insurance eligibility नीति सक्रिय गर्न कम्तीमा एउटा billing rule छान्नुहोस्।');
  }
  if (!Number.isInteger(settings.minPaidRules) || settings.minPaidRules < 1) {
    throw new Error('कम्तीमा भुक्तानी हुनुपर्ने नियम संख्या १ वा सोभन्दा बढी हुनुपर्छ।');
  }
  if (ruleIds.length > 0 && settings.minPaidRules > ruleIds.length) {
    throw new Error(`कम्तीमा भुक्तानी हुनुपर्ने नियम संख्या छानिएका नियम (${ruleIds.length}) भन्दा बढी हुन मिल्दैन।`);
  }
  return {
    enabled: settings.enabled,
    ruleIds,
    minPaidRules: settings.minPaidRules,
  };
}

export async function fetchInsuranceEligibilitySettings(): Promise<InsuranceEligibilityDocument> {
  const grouped = await fetchGroupedSettingsDocument();
  if (findGroupedSettingRecord(grouped.rawRecords)) {
    return {
      resourceId: grouped.resourceId,
      settings: {
        ...grouped.settings.insuranceEligibility,
        ruleIds: normalizeRuleIds(grouped.settings.insuranceEligibility.ruleIds),
      },
    };
  }

  const matches = grouped.rawRecords
    .map(parseLegacySetting)
    .filter((setting): setting is InsuranceEligibilityDocument => setting !== null);
  if (matches.length > 1) throw new Error('एकभन्दा बढी Insurance eligibility सेटिङ भेटिए।');
  return matches[0] ?? { resourceId: null, settings: DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS };
}

export async function saveInsuranceEligibilitySettings(
  settings: InsuranceEligibilitySettings,
  current: InsuranceEligibilityDocument,
): Promise<InsuranceEligibilityDocument> {
  const normalizedSettings = validateInsuranceEligibilitySettings(settings);
  const saved = await updateGroupedSettingsSection(
    (grouped) => ({ ...grouped, insuranceEligibility: normalizedSettings }),
    { resourceIdHint: current.resourceId },
  );
  return { resourceId: saved.resourceId, settings: normalizedSettings };
}

export interface InsuranceEligibilityRuleOption {
  rule: BillingRule;
  feeHeadName: string;
  vehicleCategoryName: string | null;
  fiscalYearName: string;
  label: string;
}

export function buildInsuranceEligibilityRuleOptions(input: {
  rules: BillingRule[];
  feeHeads: FeeHead[];
  fiscalYears: FiscalYear[];
  vehicleCategories: VehicleTypeRecord[];
}): InsuranceEligibilityRuleOption[] {
  const feeHeadNames = new Map(input.feeHeads.map((head) => [head.id, head.name]));
  const fiscalYearNames = new Map(input.fiscalYears.map((year) => [year.id, year.name]));
  const categoryNames = new Map(input.vehicleCategories.map((cat) => [cat.id, cat.category]));

  return input.rules
    .filter((rule) => rule.status === 'ACTIVE')
    .map((rule) => {
      const feeHeadName = feeHeadNames.get(rule.feeHeadId) ?? rule.feeHeadId;
      const vehicleCategoryName = rule.scope === 'VEHICLE_TYPE' && rule.vehicleCategoryId
        ? categoryNames.get(rule.vehicleCategoryId) ?? rule.vehicleCategoryId
        : null;
      const fiscalYearName = fiscalYearNames.get(rule.fiscalYearId) ?? rule.fiscalYearId;
      const label = vehicleCategoryName ? `${feeHeadName} • ${vehicleCategoryName}` : feeHeadName;
      return {
        rule,
        feeHeadName,
        vehicleCategoryName,
        fiscalYearName,
        label,
      };
    });
}

export function summarizeInsuranceEligibilitySelection(
  options: InsuranceEligibilityRuleOption[],
  selectedRuleIds: string[],
) {
  const selectedSet = new Set(selectedRuleIds);
  const selectedOptions = options.filter((option) => selectedSet.has(option.rule.id));
  const commonRules = selectedOptions.filter((option) => option.rule.scope === 'COMMON');
  const vehicleTypeRules = selectedOptions.filter((option) => option.rule.scope === 'VEHICLE_TYPE');
  return {
    totalVisibleCount: options.length,
    selectedCount: selectedOptions.length,
    commonRules,
    vehicleTypeRules,
  };
}
