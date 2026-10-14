import { z } from 'zod';

export type LinkedFeeRuleLineItem = {
  ruleId: string;
  kind: string;
  label: string;
  amount?: number | null;
};

export type LinkedFeeRuleMapping = {
  id: string;
  enabled: boolean;
  fiscalYear?: string | null;
  triggerFeeKey: string;
  linkedFeeKey: string;
  oncePerFiscalYear: boolean;
};

export type LinkedFeeRuleSettings = {
  enabled: boolean;
  mappings: LinkedFeeRuleMapping[];
  vehicleFeeTitleIdentityRefs?: Record<string, string>;
};

const mappingSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enabled: z.boolean().optional().default(true),
  fiscalYear: z.string().trim().min(1).max(20).nullable().optional(),
  triggerFeeKey: z.string().trim().min(1).max(300),
  linkedFeeKey: z.string().trim().min(1).max(300),
  oncePerFiscalYear: z.boolean().optional().default(true),
});

const settingsSchema = z.object({
  enabled: z.boolean().optional().default(false),
  mappings: z.array(mappingSchema).max(25).optional().default([]),
  vehicleFeeTitleIdentityRefs: z.record(z.string().trim().min(1), z.string().trim().min(1)).optional(),
});

export function normalizeFeeText(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/gu, ' ');
}

export function resolveLinkedFeeTitleLabel(value: string | null | undefined): string {
  const normalized = normalizeFeeText(value);
  const parts = normalized.split(' - ').map(normalizeFeeText).filter(Boolean);
  return parts.at(-1) ?? normalized;
}

export function normalizeLinkedFeeFiscalYear(value: string | null | undefined): string | null {
  const normalized = normalizeFeeText(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeFeeTitleKey(value: string | null | undefined): string {
  const normalized = normalizeFeeText(value);
  const separatorIndex = normalized.indexOf('::');
  if (separatorIndex < 0) return normalized;

  const kind = normalizeFeeText(normalized.slice(0, separatorIndex));
  const label = resolveLinkedFeeTitleLabel(normalized.slice(separatorIndex + 2));
  if (!kind || !label) return normalized;

  return `${kind}::${label.toLocaleLowerCase()}`;
}

export function buildFeeTitleKey(item: Pick<LinkedFeeRuleLineItem, 'kind' | 'label'>): string {
  return normalizeFeeTitleKey(`${normalizeFeeText(item.kind)}::${normalizeFeeText(item.label)}`);
}

export function normalizeLinkedFeeRuleSettings(value: unknown): LinkedFeeRuleSettings {
  const parsed = settingsSchema.safeParse(value);
  if (!parsed.success) return { enabled: false, mappings: [] };

  const mappings = parsed.data.mappings
    .map((mapping) => ({
      ...mapping,
      fiscalYear: normalizeLinkedFeeFiscalYear(mapping.fiscalYear),
      triggerFeeKey: normalizeFeeTitleKey(mapping.triggerFeeKey),
      linkedFeeKey: normalizeFeeTitleKey(mapping.linkedFeeKey),
    }))
    .filter((mapping) => mapping.triggerFeeKey && mapping.linkedFeeKey)
    .filter((mapping) => mapping.triggerFeeKey !== mapping.linkedFeeKey);

  return { enabled: parsed.data.enabled, mappings,
    vehicleFeeTitleIdentityRefs: parsed.data.vehicleFeeTitleIdentityRefs };
}

export function isLinkedFeeMappingForFiscalYear(
  mapping: Pick<LinkedFeeRuleMapping, 'fiscalYear'>,
  fiscalYear: string | null | undefined,
): boolean {
  const mappingFiscalYear = normalizeLinkedFeeFiscalYear(mapping.fiscalYear);
  if (!mappingFiscalYear) return true;

  return mappingFiscalYear === normalizeLinkedFeeFiscalYear(fiscalYear);
}

export function resolveLinkedFeeAdditions(params: {
  settings: LinkedFeeRuleSettings;
  fiscalYear?: string | null;
  selectedItems: readonly LinkedFeeRuleLineItem[];
  availableItems: readonly LinkedFeeRuleLineItem[];
  coveredFeeKeys: ReadonlySet<string>;
}): LinkedFeeRuleLineItem[] {
  if (!params.settings.enabled) return [];

  const selectedKeys = new Set(params.selectedItems.map(buildFeeTitleKey));
  const availableByKey = new Map<string, LinkedFeeRuleLineItem>();

  for (const item of params.availableItems) {
    const key = buildFeeTitleKey(item);
    if (!availableByKey.has(key)) availableByKey.set(key, item);
  }

  const additions: LinkedFeeRuleLineItem[] = [];
  for (const mapping of params.settings.mappings) {
    if (!mapping.enabled) continue;
    if (!isLinkedFeeMappingForFiscalYear(mapping, params.fiscalYear)) continue;
    if (!selectedKeys.has(mapping.triggerFeeKey)) continue;
    if (selectedKeys.has(mapping.linkedFeeKey)) continue;
    if (mapping.oncePerFiscalYear && params.coveredFeeKeys.has(mapping.linkedFeeKey)) continue;

    const linkedItem = availableByKey.get(mapping.linkedFeeKey);
    if (!linkedItem) continue;

    additions.push(linkedItem);
    selectedKeys.add(mapping.linkedFeeKey);
  }

  return additions;
}
