import { apiClient } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { EMPTY_BILLING_RULE_CONFIG } from '@/features/billing-rules/model/defaults';
import type { BillingRule, BillingRuleConfig, FeeHead, FiscalYear, Validity } from '@/features/billing-rules/model/types';

export interface BillingRuleResourceDocument {
  resourceId: string | null;
  config: BillingRuleConfig;
}

type ResourceRecord = Record<string, unknown>;

function asRecord(value: unknown): ResourceRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as ResourceRecord
    : null;
}

function parseSerializedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function idString(value: unknown): string | null {
  value = parseSerializedJson(value);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  const record = asRecord(value);
  if (!record) return null;
  const id = Object.entries(record).find(([key]) =>
    ['id', '_id', 'resourceid', 'resource_id'].includes(key.toLowerCase()),
  )?.[1];
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}

function resourceId(value: unknown): string | null {
  value = parseSerializedJson(value);
  if (Array.isArray(value)) return value[0] ? resourceId(value[0]) : null;
  const root = asRecord(value);
  if (!root) return null;
  const directId = idString(
    root.id
    ?? root.Id
    ?? root.ID
    ?? root.resource_id
    ?? root.ResourceId
    ?? root.ResourceID
    ?? root.resourceId,
  );
  if (directId) return directId;
  for (const key of ['data', 'Data', 'result', 'Result', 'resource', 'Resource', 'record', 'Record']) {
    if (root[key] !== undefined) {
      const nestedId = resourceId(root[key]);
      if (nestedId) return nestedId;
    }
  }
  return null;
}

function normalizeFeeHead(value: unknown, fallbackId?: unknown, fallbackFiscalYearId?: unknown): FeeHead | null {
  const record = asRecord(value);
  const id = idString(record?.id ?? fallbackId);
  if (!id) return null;
  return {
    id,
    code: typeof record?.code === 'string' ? record.code : id,
    fiscalYearId: idString(record?.fiscalYearId ?? record?.fiscal_year_id ?? fallbackFiscalYearId),
    name: typeof record?.name === 'string' ? record.name : id,
    status: record?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

function normalizeFiscalYear(value: unknown, fallbackId?: unknown): FiscalYear | null {
  const record = asRecord(value);
  const id = idString(record?.id ?? fallbackId);
  if (!id) return null;
  return {
    id,
    code: typeof record?.code === 'string' ? record.code : undefined,
    isDefault: record?.isDefault === true || record?.is_default === true,
    name: typeof record?.name === 'string' ? record.name : id,
    startDate: typeof record?.startDate === 'string' ? record.startDate : '',
    endDate: typeof record?.endDate === 'string' ? record.endDate : '',
    status: record?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
  };
}

function normalizeRule(candidate: unknown, rootId?: unknown): BillingRule | null {
  const record = asRecord(candidate);
  if (!record) return null;

  const fiscalYearId = idString(record.fiscalYearId ?? record.fiscal_year_id ?? record.fiscalYear);
  const feeHead = normalizeFeeHead(record.feeHead, record.feeHeadId, fiscalYearId);
  const fiscalYear = normalizeFiscalYear(record.fiscalYear, record.fiscalYearId);
  const id = idString(rootId ?? record.id ?? record.resourceId);
  if (!id || !feeHead || !fiscalYear) return null;

  if (record.scope !== 'VEHICLE_TYPE' && record.scope !== 'COMMON') return null;
  if (record.frequency !== 'PERIODIC' && record.frequency !== 'ONE_TIME') return null;
  if (record.status !== 'ACTIVE' && record.status !== 'INACTIVE') return null;
  const scope = record.scope;
  const period = record.period === null && scope === 'COMMON' && record.frequency === 'ONE_TIME'
    ? null
    : record.period === 'MONTH' || record.period === 'FISCAL_YEAR'
      ? record.period
      : undefined;
  if (period === undefined) return null;
  const validityValue = record.validity ?? record.Validity ?? record.timing;
  if (validityValue !== 'SAME_DAY' && validityValue !== 'END_OF_MONTH' && validityValue !== 'END_OF_FISCAL_YEAR') {
    return null;
  }
  const validity: Validity = validityValue === 'END_OF_MONTH' || validityValue === 'END_OF_FISCAL_YEAR'
    ? validityValue
    : 'SAME_DAY';
  const amount = Number(record.amount);
  const vehicleCategoryId = scope === 'COMMON' ? null : idString(record.vehicleCategoryId ?? record.vehicleTypeId);
  const billingEntityValue = parseSerializedJson(record.billingEntity);
  const entityId = idString(
    record.billingEntityId
    ?? record.billing_entity_id
    ?? billingEntityValue
    ?? record.entityId,
  );
  if (!Number.isFinite(amount) || (scope === 'VEHICLE_TYPE' && !vehicleCategoryId)) return null;

  return {
    id,
    feeHeadId: feeHead.id,
    fiscalYearId: fiscalYear.id,
    billingEntityId: entityId,
    scope,
    vehicleCategoryId,
    frequency: record.frequency,
    period,
    validity,
    amount,
    status: record.status,
    effectiveDate: typeof record.effectiveDate === 'string' ? record.effectiveDate : undefined,
    meetingReference: typeof record.meetingReference === 'string' ? record.meetingReference : undefined,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const values = new Map<string, T>();
  for (const item of items) {
    if (!values.has(item.id)) values.set(item.id, item);
  }
  return Array.from(values.values());
}

function toConfig(value: unknown, rootId?: unknown): BillingRuleConfig {
  const root = asRecord(value);
  if (!root) return EMPTY_BILLING_RULE_CONFIG;
  const inner = asRecord(root.inner_content) ?? root;

  if (inner.resourceType === 'FISCAL_YEAR') {
    const fiscalYear = normalizeFiscalYear(inner, rootId ?? root.id);
    return fiscalYear ? {
      version: 1,
      feeHeads: [],
      fiscalYears: [fiscalYear],
      rules: [],
    } : EMPTY_BILLING_RULE_CONFIG;
  }

  if (inner.resourceType === 'FEE_HEAD') {
    const feeHead = normalizeFeeHead(inner, rootId ?? root.id);
    return feeHead ? {
      version: 1,
      feeHeads: [feeHead],
      fiscalYears: [],
      rules: [],
    } : EMPTY_BILLING_RULE_CONFIG;
  }

  if (Array.isArray(inner.rules)) {
    const rules = inner.rules
      .map((rule) => normalizeRule(rule))
      .filter((rule): rule is BillingRule => rule !== null);
    const feeHeads = Array.isArray(inner.feeHeads) ? inner.feeHeads
      .map((item) => normalizeFeeHead(item))
      .filter((item): item is FeeHead => item !== null) : [];
    const fiscalYears = Array.isArray(inner.fiscalYears) ? inner.fiscalYears
      .map((item) => normalizeFiscalYear(item))
      .filter((item): item is FiscalYear => item !== null) : [];
    const ruleFeeHeads = rules
      .map((rule) => normalizeFeeHead(undefined, rule.feeHeadId, rule.fiscalYearId))
      .filter((item): item is FeeHead => item !== null);
    const ruleFiscalYears = rules
      .map((rule) => normalizeFiscalYear(undefined, rule.fiscalYearId))
      .filter((item): item is FiscalYear => item !== null);
    return {
      version: typeof inner.version === 'number' ? inner.version : 1,
      feeHeads: uniqueById([...feeHeads, ...ruleFeeHeads]),
      fiscalYears: uniqueById([...fiscalYears, ...ruleFiscalYears]),
      rules,
    };
  }

  const rule = normalizeRule(inner, rootId ?? root.id);
  if (!rule) return EMPTY_BILLING_RULE_CONFIG;
  const feeHead = normalizeFeeHead(inner.feeHead, inner.feeHeadId, idString(inner.fiscalYearId ?? inner.fiscalYear));
  const fiscalYear = normalizeFiscalYear(inner.fiscalYear, inner.fiscalYearId);
  if (!feeHead || !fiscalYear) return EMPTY_BILLING_RULE_CONFIG;
  return {
    version: 1,
    feeHeads: [feeHead],
    fiscalYears: [fiscalYear],
    rules: [rule],
  };
}

function getResourceList(payload: unknown): unknown[] {
  payload = parseSerializedJson(payload);
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];
  if (root.resource_name === 'BillingRuleResource' && root.inner_content !== undefined) return [payload];

  for (const key of ['data', 'Data', 'item', 'Item', 'items', 'Items', 'result', 'Result', 'results', 'Results', 'resource', 'Resource', 'resources', 'Resources', 'record', 'Record', 'records', 'Records']) {
    const value = root[key];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' || asRecord(value)) return getResourceList(value);
  }
  const values = Object.values(root);
  if (values.length > 0 && values.every((value) => {
    const record = asRecord(value);
    return record?.resource_name === 'BillingRuleResource' && record.inner_content !== undefined;
  })) {
    return values;
  }
  return [payload];
}

export function mapBillingRuleResource(value: unknown): BillingRuleResourceDocument {
  let parsedValue = parseSerializedJson(value);
  let root = asRecord(parsedValue);
  while (root) {
    const nested = root.data ?? root.Data ?? root.result ?? root.Result ?? root.resource ?? root.Resource ?? root.record ?? root.Record;
    if (nested === undefined) break;
    parsedValue = parseSerializedJson(nested);
    root = asRecord(parsedValue);
  }
  const id = resourceId(parsedValue) ?? resourceId(value);
  const config = toConfig(root ?? value, root?.id);
  if (!id) {
    const fields = root ? Object.keys(root).slice(0, 12).join(', ') : 'non-object response';
    throw new Error(`The BillingRuleResource response is missing its ID (resource fields: ${fields}).`);
  }
  return {
    resourceId: id,
    config,
  };
}

export function unwrapBillingRuleResource(value: unknown): BillingRuleConfig {
  if (Array.isArray(value)) {
    const configs = value.map(unwrapBillingRuleResource);
    return {
      version: 1,
      feeHeads: uniqueById(configs.flatMap((config) => config.feeHeads)),
      fiscalYears: uniqueById(configs.flatMap((config) => config.fiscalYears)),
      rules: configs.flatMap((config) => config.rules),
    };
  }

  const root = asRecord(value);
  if (root?.data) return unwrapBillingRuleResource(root.data);
  return toConfig(value, root?.id);
}

export async function listBillingRuleResources(): Promise<BillingRuleResourceDocument[]> {
  const payload = await apiClient.get<unknown>(endpoints.resources.billingRule.list());
  const documents = getResourceList(payload).map(mapBillingRuleResource);
  if (documents.some((document) => !(
    document.config.rules.length === 1
    || (document.config.rules.length === 0 && document.config.feeHeads.length === 1 && document.config.fiscalYears.length === 0)
    || (document.config.rules.length === 0 && document.config.feeHeads.length === 0 && document.config.fiscalYears.length === 1)
  ))) {
    throw new Error('The BillingRuleResource list contains an invalid resource record.');
  }
  return documents;
}

function resourceIdValue(value: string): string | number {
  return /^\d+$/u.test(value) ? Number(value) : value;
}

function toResourceContent(config: BillingRuleConfig, rule: BillingRule): ResourceRecord {
  const feeHead = config.feeHeads.find((item) => item.id === rule.feeHeadId);
  return {
    resourceType: 'BILLING_RULE',
    feeHead: { id: resourceIdValue(rule.feeHeadId), name: feeHead?.name ?? rule.feeHeadId },
    fiscalYearId: resourceIdValue(rule.fiscalYearId),
    billingEntityId: rule.billingEntityId === null ? null : resourceIdValue(rule.billingEntityId),
    scope: rule.scope,
    vehicleCategoryId: rule.vehicleCategoryId === null ? null : resourceIdValue(rule.vehicleCategoryId),
    frequency: rule.frequency,
    period: rule.period,
    validity: rule.validity,
    amount: rule.amount,
    status: rule.status,
    ...(rule.effectiveDate ? { effectiveDate: rule.effectiveDate } : {}),
    ...(rule.meetingReference ? { meetingReference: rule.meetingReference } : {}),
  };
}

function toFeeHeadResourceContent(feeHead: FeeHead): ResourceRecord {
  return {
    resourceType: 'FEE_HEAD',
    name: feeHead.name,
    code: feeHead.code ?? '',
    fiscalYearId: feeHead.fiscalYearId ? resourceIdValue(feeHead.fiscalYearId) : null,
    status: feeHead.status,
  };
}

function toFiscalYearResourceContent(fiscalYear: FiscalYear): ResourceRecord {
  return {
    resourceType: 'FISCAL_YEAR',
    code: fiscalYear.code,
    name: fiscalYear.name,
    startDate: fiscalYear.startDate,
    endDate: fiscalYear.endDate,
    status: fiscalYear.status,
    isDefault: fiscalYear.isDefault === true,
  };
}

function fallbackFeeHeadDocument(feeHead: FeeHead, id: string): BillingRuleResourceDocument {
  return {
    resourceId: id,
    config: {
      version: 1,
      feeHeads: [{ ...feeHead, id }],
      fiscalYears: [],
      rules: [],
    },
  };
}

function fallbackFiscalYearDocument(fiscalYear: FiscalYear, id: string): BillingRuleResourceDocument {
  return {
    resourceId: id,
    config: {
      version: 1,
      feeHeads: [],
      fiscalYears: [{ ...fiscalYear, id }],
      rules: [],
    },
  };
}

export async function createBillingRuleFiscalYear(fiscalYear: FiscalYear): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.post<unknown>(endpoints.resources.billingRule.create(), {
    resource_name: 'BillingRuleResource',
    inner_content: toFiscalYearResourceContent(fiscalYear),
    external_content: null,
  });
  const document = mapBillingRuleResource(payload);
  if (!document.resourceId) throw new Error('The created Fiscal Year did not return a resource ID.');
  return document.config.fiscalYears.length ? document : fallbackFiscalYearDocument(fiscalYear, document.resourceId);
}

export async function updateBillingRuleFiscalYear(id: string, fiscalYear: FiscalYear): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.put<unknown>(endpoints.resources.billingRule.update(id), {
    id: resourceIdValue(id),
    resource_name: 'BillingRuleResource',
    inner_content: toFiscalYearResourceContent(fiscalYear),
    external_content: null,
  });
  const returnedId = resourceId(payload);
  if (!returnedId) return fallbackFiscalYearDocument(fiscalYear, id);
  const document = mapBillingRuleResource(payload);
  return document.config.fiscalYears.length
    ? document
    : fallbackFiscalYearDocument(fiscalYear, returnedId);
}

export async function createBillingRuleFeeHead(feeHead: FeeHead): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.post<unknown>(endpoints.resources.billingRule.create(), {
    resource_name: 'BillingRuleResource',
    inner_content: toFeeHeadResourceContent(feeHead),
    external_content: null,
  });
  const document = mapBillingRuleResource(payload);
  if (!document.resourceId) throw new Error('The created Fee Head did not return a resource ID.');
  return document.config.feeHeads.length ? document : fallbackFeeHeadDocument(feeHead, document.resourceId);
}

export async function updateBillingRuleFeeHead(id: string, feeHead: FeeHead): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.put<unknown>(endpoints.resources.billingRule.update(id), {
    id: resourceIdValue(id),
    resource_name: 'BillingRuleResource',
    inner_content: toFeeHeadResourceContent(feeHead),
    external_content: null,
  });
  const returnedId = resourceId(payload);
  if (!returnedId) return fallbackFeeHeadDocument(feeHead, id);
  const document = mapBillingRuleResource(payload);
  return document.config.feeHeads.length
    ? document
    : fallbackFeeHeadDocument(feeHead, returnedId);
}

function fallbackDocument(config: BillingRuleConfig, rule: BillingRule, id: string | null): BillingRuleResourceDocument {
  const savedRule = { ...rule, id: id ?? rule.id };
  return {
    resourceId: id,
    config: {
      version: config.version,
      feeHeads: config.feeHeads.filter((item) => item.id === rule.feeHeadId),
      fiscalYears: config.fiscalYears.filter((item) => item.id === rule.fiscalYearId),
      rules: [savedRule],
    },
  };
}

export async function createBillingRuleResource(config: BillingRuleConfig, rule: BillingRule): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.post<unknown>(endpoints.resources.billingRule.create(), {
    resource_name: 'BillingRuleResource',
    inner_content: toResourceContent(config, rule),
    external_content: null,
  });
  const document = mapBillingRuleResource(payload);
  const id = document.resourceId ?? document.config.rules[0]?.id ?? null;
  if (!id) throw new Error('The created BillingRuleResource did not return a resource ID.');
  return document.config.rules.length ? document : fallbackDocument(config, rule, id);
}

export async function updateBillingRuleResource(
  id: string,
  config: BillingRuleConfig,
  rule: BillingRule,
): Promise<BillingRuleResourceDocument> {
  const payload = await apiClient.put<unknown>(endpoints.resources.billingRule.update(id), {
    id: resourceIdValue(id),
    resource_name: 'BillingRuleResource',
    inner_content: toResourceContent(config, rule),
    external_content: null,
  });
  const returnedId = resourceId(payload);
  if (!returnedId) return fallbackDocument(config, rule, id);
  const document = mapBillingRuleResource(payload);
  return document.config.rules.length ? document : fallbackDocument(config, rule, id);
}

export async function deleteBillingRuleResource(id: string): Promise<void> {
  await apiClient.delete<void>(endpoints.resources.billingRule.delete(id));
}
