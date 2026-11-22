import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { VatSettings } from '@/features/settings/api/vat-settings.api';
import type { LinkedFeeRule, LinkedFeeRulesSettings } from '@/features/settings/api/linked-fee-rules.api';
import type { ReceiptCancelWindow } from '@/features/settings/api/receipt-cancel-window.api';
import type { FiscalYearSelectorSettings } from '@/features/settings/api/fiscal-year-selector.api';
import type { InsuranceEligibilitySettings } from '@/features/settings/api/insurance-eligibility.api';
import type { ArrearsRuleSettings } from '@/features/vehicle/compliance/api/arrears-settings.api';
import {
  DEFAULT_SMS_SETTINGS,
  validateSmsTemplatesSettings,
} from '@/features/notifications/utils/notification-settings-validation';
import type { SmsTemplatesSettings } from '@/features/notifications/types';
import { formatNepaliFiscalYearLabel, parseFiscalYear } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export const GROUPED_SETTINGS_SCHEMA_VERSION = 1 as const;

export type BillingFiscalYearAccessStatus = 'OPEN' | 'CLOSED';

export interface BillingFiscalYearControlEntry {
  fiscalYear: string;
  status: BillingFiscalYearAccessStatus;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface BillingFiscalYearAccessSettings {
  previousYear: BillingFiscalYearControlEntry | null;
  nextYear: BillingFiscalYearControlEntry | null;
}

export interface GroupedFiscalYearPreferences {
  selector: FiscalYearSelectorSettings;
  billingAccess: BillingFiscalYearAccessSettings;
}

export interface GroupedSettingsContent {
  SanghBranch: string;
  schemaVersion: 1;
  fiscalYear: GroupedFiscalYearPreferences;
  arrears: ArrearsRuleSettings;
  linkedFeeRules: LinkedFeeRulesSettings;
  vat: VatSettings;
  smsSettings: SmsTemplatesSettings;
  insuranceEligibility: InsuranceEligibilitySettings;
  receiptCancelWindow: ReceiptCancelWindow;
  displacedTagging: {
    enabled: boolean;
  };
}

export interface GroupedSettingsDocument {
  resourceId: string | null;
  settings: GroupedSettingsContent;
  rawRecords: JsonRecord[];
  needsMigration: boolean;
}

export type JsonRecord = Record<string, unknown>;

export const DEFAULT_GROUPED_SETTINGS: GroupedSettingsContent = {
  SanghBranch: '',
  schemaVersion: 1,
  fiscalYear: {
    selector: {
      yearsBack: 4,
      yearsForward: 1,
      archivedYears: [],
    },
    billingAccess: {
      previousYear: null,
      nextYear: null,
    },
  },
  arrears: {
    paidExpired: { enabled: false, billingRuleId: '' },
    monthlyPaid: { enabled: false, fiscalYearId: '', billingRuleId: '' },
  },
  linkedFeeRules: {
    enabled: false,
    rules: [],
  },
  vat: {
    enabled: false,
    rate: 13,
    billingEntityIds: [],
  },
  smsSettings: DEFAULT_SMS_SETTINGS,
  insuranceEligibility: {
    enabled: false,
    ruleIds: [],
    minPaidRules: 1,
  },
  receiptCancelWindow: {
    enabled: false,
    hours: 24,
  },
  displacedTagging: {
    enabled: true,
  },
};

export function asSettingRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

export function parseSettingJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function extractSettingRows(value: unknown, errorMessage = 'सेटिङ पढ्न सकिएन।'): JsonRecord[] {
  const parsed = parseSettingJson(value);
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      const record = asSettingRecord(item);
      return record ? [record] : Array.isArray(item) ? extractSettingRows(item, errorMessage) : [];
    });
  }
  const record = asSettingRecord(parsed);
  if (!record) throw new Error(errorMessage);
  for (const key of ['data', 'items', 'results', 'resources', 'records', 'result']) {
    if (record[key] !== undefined) return extractSettingRows(record[key], errorMessage);
  }
  if (record.resource_name === 'SettingResource' || record.resourceName === 'SettingResource') return [record];
  if (record.inner_content !== undefined || record.innerContent !== undefined) return [record];
  throw new Error(errorMessage);
}

export function getSettingResourceId(record: JsonRecord): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (!['id', 'resourceid', 'resource_id', 'settingid', 'setting_id'].includes(key.toLocaleLowerCase())) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return null;
}

export function extractResponseResourceId(value: unknown): string | null {
  const parsed = parseSettingJson(value);
  if (Array.isArray(parsed)) return parsed.length ? extractResponseResourceId(parsed[0]) : null;
  const record = asSettingRecord(parsed);
  if (!record) return null;
  const id = getSettingResourceId(record);
  if (id) return id;
  for (const key of ['data', 'result', 'resource', 'record', 'setting']) {
    const nestedId = extractResponseResourceId(record[key]);
    if (nestedId) return nestedId;
  }
  return null;
}

function isMissingSettingResourceError(error: unknown): boolean {
  return error instanceof Error
    && /^Request failed \(404\)/u.test(error.message);
}

function normalizeBranch(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBranchKey(value: unknown): string {
  return normalizeBranch(value).replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function normalizeFiscalYearLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = parseFiscalYear(value.trim());
  return parsed !== null ? formatNepaliFiscalYearLabel(parsed) : null;
}

function normalizeBillingFiscalYearControlEntry(raw: unknown): BillingFiscalYearControlEntry | null {
  const record = asSettingRecord(raw);
  if (!record) return null;
  const fiscalYear = normalizeFiscalYearLabel(record.fiscalYear);
  if (!fiscalYear) return null;
  const updatedAt = typeof record.updatedAt === 'string' && record.updatedAt.trim()
    ? record.updatedAt.trim()
    : null;
  const updatedBy = typeof record.updatedBy === 'string' && record.updatedBy.trim()
    ? record.updatedBy.trim()
    : null;
  return {
    fiscalYear,
    status: record.status === 'OPEN' ? 'OPEN' : 'CLOSED',
    updatedAt,
    updatedBy,
  };
}

function normalizeLinkedFeeRulesList(raw: unknown): LinkedFeeRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): LinkedFeeRule[] => {
    const rule = asSettingRecord(item);
    if (!rule || typeof rule.id !== 'string') return [];
    const fiscalYearId = typeof rule.fiscalYearId === 'string'
      ? rule.fiscalYearId
      : typeof rule.fiscalYear === 'string'
        ? rule.fiscalYear
        : '';
    if (
      typeof rule.sourceFeeHeadId !== 'string'
      || typeof rule.linkedFeeHeadId !== 'string'
      || typeof rule.active !== 'boolean'
      || typeof rule.oncePerFiscalYear !== 'boolean'
    ) {
      return [];
    }
    return [{
      id: rule.id,
      fiscalYearId,
      sourceFeeHeadId: rule.sourceFeeHeadId,
      linkedFeeHeadId: rule.linkedFeeHeadId,
      active: rule.active,
      oncePerFiscalYear: rule.oncePerFiscalYear,
    }];
  });
}

function isGroupedSettingContent(content: JsonRecord | null): content is JsonRecord {
  if (!content) return false;
  if (typeof content.key === 'string') return false;
  return (
    typeof content.schemaVersion === 'number'
    || typeof content.SanghBranch === 'string'
    || content.integrations !== undefined
    || content.fiscalYear !== undefined
    || content.billing !== undefined
    || content.notifications !== undefined
    || content.insurance !== undefined
    || content.receipts !== undefined
    || content.vehicleManagement !== undefined
    || content.arrears !== undefined
    || content.linkedFeeRules !== undefined
    || content.vat !== undefined
    || content.smsSettings !== undefined
    || content.insuranceEligibility !== undefined
    || content.receiptCancelWindow !== undefined
    || content.displacedTagging !== undefined
  );
}

function mergeGroupedContent(content: JsonRecord): GroupedSettingsContent {
  const integrationsRaw = asSettingRecord(content.integrations);
  const tqmsRaw = asSettingRecord(integrationsRaw?.tqms);
  const billingRaw = asSettingRecord(content.billing);
  const notificationsRaw = asSettingRecord(content.notifications);
  const insuranceOuterRaw = asSettingRecord(content.insurance);
  const receiptsRaw = asSettingRecord(content.receipts);
  const vehicleManagementRaw = asSettingRecord(content.vehicleManagement);

  const fiscalYearRaw = asSettingRecord(content.fiscalYear);
  const selectorRaw = asSettingRecord(fiscalYearRaw?.selector);
  const billingAccessRaw = asSettingRecord(fiscalYearRaw?.billingAccess);
  const arrearsRaw = asSettingRecord(billingRaw?.arrears) ?? asSettingRecord(content.arrears);
  const paidExpiredRaw = asSettingRecord(arrearsRaw?.paidExpired);
  const monthlyPaidRaw = asSettingRecord(arrearsRaw?.monthlyPaid);
  const linkedFeeRulesRaw = asSettingRecord(billingRaw?.linkedFeeRules) ?? asSettingRecord(content.linkedFeeRules);
  const vatRaw = asSettingRecord(billingRaw?.vat) ?? asSettingRecord(content.vat);
  const smsRaw = asSettingRecord(notificationsRaw?.sms) ?? asSettingRecord(content.smsSettings);
  const insuranceRaw = asSettingRecord(insuranceOuterRaw?.eligibility) ?? asSettingRecord(content.insuranceEligibility);
  const cancelRaw = asSettingRecord(receiptsRaw?.cancellation) ?? asSettingRecord(content.receiptCancelWindow);
  const displacedRaw = asSettingRecord(vehicleManagementRaw?.displacedTagging) ?? asSettingRecord(content.displacedTagging);

  let smsSettings = DEFAULT_SMS_SETTINGS;
  if (smsRaw) {
    try {
      smsSettings = validateSmsTemplatesSettings(smsRaw);
    } catch {
      smsSettings = DEFAULT_SMS_SETTINGS;
    }
  }

  const monthlyFiscalYearId = typeof monthlyPaidRaw?.fiscalYearId === 'string'
    ? monthlyPaidRaw.fiscalYearId
    : typeof monthlyPaidRaw?.fiscalYear === 'string'
      ? monthlyPaidRaw.fiscalYear
      : '';

  return {
    SanghBranch: normalizeBranch(tqmsRaw?.SanghBranch ?? content.SanghBranch),
    schemaVersion: 1,
    fiscalYear: {
      selector: {
        yearsBack: typeof selectorRaw?.yearsBack === 'number' ? selectorRaw.yearsBack : DEFAULT_GROUPED_SETTINGS.fiscalYear.selector.yearsBack,
        yearsForward: typeof selectorRaw?.yearsForward === 'number' ? selectorRaw.yearsForward : DEFAULT_GROUPED_SETTINGS.fiscalYear.selector.yearsForward,
        archivedYears: Array.isArray(selectorRaw?.archivedYears)
          ? selectorRaw.archivedYears.filter((y): y is string => typeof y === 'string')
          : DEFAULT_GROUPED_SETTINGS.fiscalYear.selector.archivedYears,
      },
      billingAccess: {
        previousYear: normalizeBillingFiscalYearControlEntry(billingAccessRaw?.previousYear),
        nextYear: normalizeBillingFiscalYearControlEntry(billingAccessRaw?.nextYear),
      },
    },
    arrears: {
      paidExpired: {
        enabled: typeof paidExpiredRaw?.enabled === 'boolean' ? paidExpiredRaw.enabled : false,
        billingRuleId: typeof paidExpiredRaw?.billingRuleId === 'string' ? paidExpiredRaw.billingRuleId : '',
      },
      monthlyPaid: {
        enabled: typeof monthlyPaidRaw?.enabled === 'boolean' ? monthlyPaidRaw.enabled : false,
        fiscalYearId: monthlyFiscalYearId,
        billingRuleId: typeof monthlyPaidRaw?.billingRuleId === 'string' ? monthlyPaidRaw.billingRuleId : '',
      },
    },
    linkedFeeRules: {
      enabled: typeof linkedFeeRulesRaw?.enabled === 'boolean' ? linkedFeeRulesRaw.enabled : false,
      rules: normalizeLinkedFeeRulesList(linkedFeeRulesRaw?.rules),
    },
    vat: {
      enabled: typeof vatRaw?.enabled === 'boolean' ? vatRaw.enabled : false,
      rate: typeof vatRaw?.rate === 'number' && Number.isFinite(vatRaw.rate) ? vatRaw.rate : 13,
      billingEntityIds: Array.isArray(vatRaw?.billingEntityIds)
        ? [...new Set(vatRaw.billingEntityIds.filter((id): id is string => typeof id === 'string'))]
        : [],
    },
    smsSettings,
    insuranceEligibility: {
      enabled: typeof insuranceRaw?.enabled === 'boolean' ? insuranceRaw.enabled : false,
      ruleIds: Array.isArray(insuranceRaw?.ruleIds)
        ? [...new Set(insuranceRaw.ruleIds.filter((id): id is string => typeof id === 'string'))]
        : [],
      minPaidRules: typeof insuranceRaw?.minPaidRules === 'number' && Number.isInteger(insuranceRaw.minPaidRules) && insuranceRaw.minPaidRules >= 1
        ? insuranceRaw.minPaidRules
        : 1,
    },
    receiptCancelWindow: {
      enabled: typeof cancelRaw?.enabled === 'boolean' ? cancelRaw.enabled : false,
      hours: typeof cancelRaw?.hours === 'number' && Number.isFinite(cancelRaw.hours) && cancelRaw.hours > 0
        ? cancelRaw.hours
        : 24,
    },
    displacedTagging: {
      enabled: typeof displacedRaw?.enabled === 'boolean' ? displacedRaw.enabled : true,
    },
  };
}

function buildMigratedSettingsFromLegacyRows(
  rows: JsonRecord[],
  preferredBranch?: string,
): { resourceId: string | null; settings: GroupedSettingsContent } {
  const merged: GroupedSettingsContent = structuredClone(DEFAULT_GROUPED_SETTINGS);
  let branchResourceId: string | null = null;

  for (const record of rows) {
    const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
    if (!content) continue;
    const recordId = getSettingResourceId(record);
    const key = typeof content.key === 'string' ? content.key : '';

    if (key === 'tqms-sangh-branch-filter') {
      const branchName = normalizeBranch(content.branchName);
      if (!preferredBranch || normalizeBranchKey(branchName) === normalizeBranchKey(preferredBranch)) {
        merged.SanghBranch = branchName;
        branchResourceId = recordId;
      }
      continue;
    }

    if (key === 'organization-vat') {
      if (typeof content.enabled === 'boolean' && typeof content.rate === 'number' && Array.isArray(content.billingEntityIds)) {
        merged.vat = {
          enabled: content.enabled,
          rate: content.rate,
          billingEntityIds: [...new Set(content.billingEntityIds.filter((id): id is string => typeof id === 'string'))],
        };
      }
      continue;
    }

    if (key === 'arrears-list-rules') {
      const paidExpired = asSettingRecord(content.paidExpired);
      const monthlyPaid = asSettingRecord(content.monthlyPaid);
      if (paidExpired && monthlyPaid) {
        merged.arrears = {
          paidExpired: {
            enabled: paidExpired.enabled === true,
            billingRuleId: typeof paidExpired.billingRuleId === 'string' ? paidExpired.billingRuleId : '',
          },
          monthlyPaid: {
            enabled: monthlyPaid.enabled === true,
            fiscalYearId: typeof monthlyPaid.fiscalYearId === 'string'
              ? monthlyPaid.fiscalYearId
              : typeof monthlyPaid.fiscalYear === 'string'
                ? monthlyPaid.fiscalYear
                : '',
            billingRuleId: typeof monthlyPaid.billingRuleId === 'string' ? monthlyPaid.billingRuleId : '',
          },
        };
      }
      continue;
    }

    if (key === 'linked-fee-rules') {
      if (typeof content.enabled === 'boolean' && Array.isArray(content.rules)) {
        merged.linkedFeeRules = {
          enabled: content.enabled,
          rules: normalizeLinkedFeeRulesList(content.rules),
        };
      }
      continue;
    }

    if (key === 'fiscal-year-selector') {
      const yearsBack = Number(content.yearsBack);
      const yearsForward = Number(content.yearsForward);
      if (Number.isInteger(yearsBack) && Number.isInteger(yearsForward) && Array.isArray(content.archivedYears)) {
        merged.fiscalYear.selector = {
          yearsBack,
          yearsForward,
          archivedYears: content.archivedYears.filter((y): y is string => typeof y === 'string'),
        };
      }
      continue;
    }

    if (key === 'notification-management') {
      try {
        merged.smsSettings = validateSmsTemplatesSettings({ templates: content.templates });
      } catch {
        // Ignore invalid legacy notification settings
      }
      continue;
    }

    if (key === 'insurance-eligibility') {
      if (typeof content.enabled === 'boolean' && Array.isArray(content.ruleIds) && typeof content.minPaidRules === 'number') {
        merged.insuranceEligibility = {
          enabled: content.enabled,
          ruleIds: [...new Set(content.ruleIds.filter((id): id is string => typeof id === 'string'))],
          minPaidRules: content.minPaidRules,
        };
      }
      continue;
    }

    if (key === 'receipt-cancel-window') {
      if (typeof content.enabled === 'boolean' && typeof content.hours === 'number') {
        merged.receiptCancelWindow = {
          enabled: content.enabled,
          hours: content.hours,
        };
      }
      continue;
    }

    if (key === 'displaced-tagging') {
      if (typeof content.enabled === 'boolean') {
        merged.displacedTagging = { enabled: content.enabled };
      }
      continue;
    }
  }

  if (preferredBranch && !merged.SanghBranch) {
    merged.SanghBranch = normalizeBranch(preferredBranch);
  }

  return { resourceId: branchResourceId, settings: merged };
}

export async function fetchSettingRows(errorMessage?: string): Promise<JsonRecord[]> {
  let payload: unknown;
  try {
    payload = await apiClient.get<unknown>(endpoints.resources.setting.list());
  } catch (error) {
    if (isMissingSettingResourceError(error)) {
      return [];
    }
    throw error;
  }
  return extractSettingRows(payload, errorMessage);
}

export function findGroupedSettingRecord(
  rows: JsonRecord[],
  sanghBranch?: string,
): { resourceId: string | null; settings: GroupedSettingsContent } | null {
  const grouped = rows
    .map((record) => {
      const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
      if (!isGroupedSettingContent(content)) return null;
      const resourceId = getSettingResourceId(record);
      return { resourceId, content, settings: mergeGroupedContent(content) };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && Boolean(item.settings.SanghBranch));

  if (grouped.length === 0) return null;

  const targetBranch = normalizeBranchKey(sanghBranch);
  if (targetBranch) {
    const exactMatch = grouped.find((item) => normalizeBranchKey(item.settings.SanghBranch) === targetBranch);
    return exactMatch ? { resourceId: exactMatch.resourceId, settings: exactMatch.settings } : null;
  }

  return { resourceId: grouped[0].resourceId, settings: grouped[0].settings };
}

export async function fetchGroupedSettingsDocument(sanghBranch?: string): Promise<GroupedSettingsDocument> {
  const rawRecords = await fetchSettingRows();
  const match = findGroupedSettingRecord(rawRecords, sanghBranch);
  if (match) {
    return {
      resourceId: match.resourceId,
      settings: match.settings,
      rawRecords,
      needsMigration: false,
    };
  }

  const migrated = buildMigratedSettingsFromLegacyRows(rawRecords, sanghBranch);
  const hasLegacyRecords = rawRecords.some((record) => {
    const content = asSettingRecord(parseSettingJson(record.inner_content ?? record.innerContent));
    return typeof content?.key === 'string' && content.key !== 'billing-sms-phone';
  });

  if (hasLegacyRecords || migrated.resourceId) {
    return {
      resourceId: migrated.resourceId,
      settings: migrated.settings,
      rawRecords,
      needsMigration: true,
    };
  }

  return {
    resourceId: null,
    settings: {
      ...DEFAULT_GROUPED_SETTINGS,
      SanghBranch: normalizeBranch(sanghBranch),
    },
    rawRecords,
    needsMigration: false,
  };
}

function serializeGroupedInnerContent(settings: GroupedSettingsContent): JsonRecord {
  return {
    schemaVersion: 1,
    integrations: {
      tqms: {
        SanghBranch: settings.SanghBranch,
      },
    },
    fiscalYear: {
      selector: settings.fiscalYear.selector,
      billingAccess: settings.fiscalYear.billingAccess,
    },
    billing: {
      vat: settings.vat,
      arrears: {
        monthlyPaid: {
          enabled: settings.arrears.monthlyPaid.enabled,
          fiscalYear: settings.arrears.monthlyPaid.fiscalYearId,
          billingRuleId: settings.arrears.monthlyPaid.billingRuleId,
        },
        paidExpired: settings.arrears.paidExpired,
      },
      linkedFeeRules: {
        enabled: settings.linkedFeeRules.enabled,
        rules: settings.linkedFeeRules.rules.map((rule) => ({
          id: rule.id,
          active: rule.active,
          fiscalYear: rule.fiscalYearId,
          linkedFeeHeadId: rule.linkedFeeHeadId,
          sourceFeeHeadId: rule.sourceFeeHeadId,
          oncePerFiscalYear: rule.oncePerFiscalYear,
        })),
      },
    },
    notifications: {
      sms: {
        enabled: settings.smsSettings.enabled,
        provider: settings.smsSettings.provider,
        apiKey: settings.smsSettings.apiKey,
        apiSecret: settings.smsSettings.apiSecret,
        senderId: settings.smsSettings.senderId,
        baseUrl: settings.smsSettings.baseUrl,
        defaultCountryCode: settings.smsSettings.defaultCountryCode,
        webhookUrl: settings.smsSettings.webhookUrl,
        templates: settings.smsSettings.templates,
      },
    },
    insurance: {
      eligibility: settings.insuranceEligibility,
    },
    receipts: {
      cancellation: settings.receiptCancelWindow,
    },
    vehicleManagement: {
      displacedTagging: settings.displacedTagging,
    },
  };
}

export async function saveGroupedSettingsDocument(
  nextSettings: GroupedSettingsContent,
  currentResourceId: string | null,
): Promise<{ resourceId: string; settings: GroupedSettingsContent }> {
  const normalizedSettings: GroupedSettingsContent = {
    ...nextSettings,
    SanghBranch: nextSettings.SanghBranch.trim(),
    schemaVersion: 1,
    fiscalYear: {
      ...nextSettings.fiscalYear,
      billingAccess: {
        previousYear: normalizeBillingFiscalYearControlEntry(nextSettings.fiscalYear.billingAccess?.previousYear),
        nextYear: normalizeBillingFiscalYearControlEntry(nextSettings.fiscalYear.billingAccess?.nextYear),
      },
    },
  };

  const request = {
    resource_name: 'SettingResource',
    inner_content: serializeGroupedInnerContent(normalizedSettings),
    external_content: null,
  };

  if (currentResourceId) {
    const id = /^\d+$/u.test(currentResourceId) ? Number(currentResourceId) : currentResourceId;
    await apiClient.put<void>(endpoints.resources.setting.update(currentResourceId), { ...request, id });
    return { resourceId: currentResourceId, settings: normalizedSettings };
  }

  const created = await apiClient.post<unknown>(endpoints.resources.setting.create(), request);
  const resourceId = extractResponseResourceId(created);
  if (!resourceId) throw new Error('सेटिङ सुरक्षित गर्दा resource ID प्राप्त भएन।');
  return { resourceId, settings: normalizedSettings };
}

export async function updateGroupedSettingsSection(
  update: (current: GroupedSettingsContent) => GroupedSettingsContent,
  options?: { sanghBranch?: string; resourceIdHint?: string | null },
): Promise<{ resourceId: string; settings: GroupedSettingsContent }> {
  const doc = await fetchGroupedSettingsDocument(options?.sanghBranch);
  const existingGrouped = findGroupedSettingRecord(doc.rawRecords, options?.sanghBranch ?? doc.settings.SanghBranch);
  const targetResourceId = existingGrouped?.resourceId ?? doc.resourceId ?? options?.resourceIdHint ?? null;
  const nextSettings = update(doc.settings);
  return saveGroupedSettingsDocument(nextSettings, targetResourceId);
}
