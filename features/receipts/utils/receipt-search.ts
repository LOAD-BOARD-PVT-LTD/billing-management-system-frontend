import { canonicalizeFiscalYearLabel } from '@/features/billing-rules/api/billingRuleResource';
import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { ReceiptFilters, ReceiptRecord, ReceiptStatus } from '@/features/receipts/model/receipt';
import { formatReceiptDate } from '@/features/receipts/utils/receipt-date';
import {
  matchesReceiptBranchFilter,
  matchesReceiptUserFilter,
} from '@/features/receipts/utils/receipt-filter-options';
import { formatReceiptNumberWithFiscalYear } from '@/lib/receipts/receipt-number-display';
import { formatCurrency, toEnglishDigits } from '@/utils/numbers';

export interface ReceiptSearchFieldForms {
  norm: string;
  spaced: string;
  compact: string;
}

export interface ReceiptSearchIndex {
  fields: ReceiptSearchFieldForms[];
}

const ZERO_WIDTH_CHARS_RE = /[\u200B-\u200D\uFEFF]/gu;
const NON_WORD_KEEP_MARKS_RE = /[^\p{L}\p{M}\p{N}]+/gu;
const UI_PREFIX_LABELS_RE = /(?:धनीको\s*नाम|सवारी\s*धनी|संचालकको\s*नाम|संचालक|सदस्यको\s*नाम|रुट)\s*[:：]\s*/gu;

const STATUS_SEARCH_LABELS: Record<ReceiptStatus, string> = {
  PAID: 'भुक्तानी',
  CANCELLED: 'रद्द',
  PENDING: 'बाँकी',
};

export function normalizeReceiptSearchText(value: string): string {
  return toEnglishDigits(value)
    .normalize('NFKC')
    .replace(ZERO_WIDTH_CHARS_RE, '')
    .toLocaleLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

export function stripReceiptSearchLabels(query: string): string {
  return query.replace(UI_PREFIX_LABELS_RE, ' ');
}

export function toSpacedSearchForm(normalized: string): string {
  return normalized.replace(NON_WORD_KEEP_MARKS_RE, ' ').replace(/\s+/gu, ' ').trim();
}

export function toCompactSearchForm(normalized: string): string {
  return normalized.replace(NON_WORD_KEEP_MARKS_RE, '');
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readStringValue(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

function collectLegacyOwnerFields(resourceContent: unknown, push: (value: unknown) => void): void {
  const root = asPlainRecord(resourceContent);
  if (!root) return;

  const vehicle = asPlainRecord(root.vehicle);
  if (vehicle) {
    push(vehicle.ownerName);
    push(vehicle.operatorName);
    push(vehicle.VehicleOwnerName);
    push(vehicle.OperatorName);

    if (Array.isArray(vehicle.Owners)) {
      for (const owner of vehicle.Owners) {
        const entry = asPlainRecord(owner);
        if (!entry) continue;
        push(entry.OwnerName);
        push(entry.Name);
        push(entry.name);
      }
    }
  }

  const customer = asPlainRecord(root.customer);
  if (customer) {
    push(customer.name);
  }
}

export function extractReceiptSearchFields(receipt: ReceiptRecord): string[] {
  const seen = new Set<string>();
  const fields: string[] = [];

  const push = (raw: unknown) => {
    const text = readStringValue(raw);
    if (!text || text === '—' || seen.has(text)) return;
    seen.add(text);
    fields.push(text);
  };

  const vehicle = receipt.bill?.content?.vehicle;
  const customer = receipt.bill?.content?.customer;
  const branch = receipt.bill?.content?.branch;
  const createdBy = receipt.bill?.content?.createdBy;

  push(receipt.receiptNumber);
  push(receipt.id);
  if (receipt.receiptNumber) {
    push(formatReceiptNumberWithFiscalYear(receipt.receiptNumber, receipt.fiscalYear));
  }

  push(receipt.vehicleNumber);
  push(receipt.finalDigits);
  push(vehicle?.vehicleType);
  push(vehicle?.route);

  push(receipt.customerName);
  push(vehicle?.ownerName);
  push(vehicle?.operatorName);
  push(customer?.name);
  collectLegacyOwnerFields(receipt.resourceContent, push);

  push(receipt.customerPhone);
  push(vehicle?.phone);
  push(vehicle?.smsPhone);
  push(customer?.phone);

  push(vehicle?.address);
  push(customer?.address);

  push(receipt.customerPanNumber);
  push(customer?.panNumber);
  push(receipt.organizationName);

  push(receipt.branchName);
  push(branch?.BranchCode);

  push(receipt.userName);
  push(createdBy?.name);
  push(createdBy?.username);

  push(receipt.paymentMethod);
  push(receipt.fiscalYear);
  push(receipt.bill?.content?.fiscalYearName);

  push(receipt.status);
  push(STATUS_SEARCH_LABELS[receipt.status]);

  push(receipt.billingType);
  push(receipt.billingType === 'GENERAL' ? 'सामान्य बिल' : 'सदस्यता बिल');

  push(receipt.billingDate);
  push(receipt.paymentDate);
  push(receipt.validUntil);
  if (receipt.billingDate) push(formatReceiptDate(receipt.billingDate));
  if (receipt.validUntil) push(formatReceiptDate(receipt.validUntil));

  if (typeof receipt.totalAmount === 'number' && Number.isFinite(receipt.totalAmount)) {
    push(String(receipt.totalAmount));
    push(formatCurrency(receipt.totalAmount, { useNepaliDigits: false }));
  }

  push(receipt.bill?.content?.note);

  if (Array.isArray(receipt.bill?.content?.items)) {
    for (const item of receipt.bill.content.items) {
      push(item.title);
      push(item.billingEntity);
    }
  }

  return fields;
}

export function buildReceiptSearchIndex(receipt: ReceiptRecord): ReceiptSearchIndex {
  const fields: ReceiptSearchFieldForms[] = [];
  for (const raw of extractReceiptSearchFields(receipt)) {
    const norm = normalizeReceiptSearchText(raw);
    if (!norm) continue;
    fields.push({
      norm,
      spaced: toSpacedSearchForm(norm),
      compact: toCompactSearchForm(norm),
    });
  }
  return { fields };
}

function fieldMatchesToken(
  field: ReceiptSearchFieldForms,
  tokenNorm: string,
  tokenSpaced: string,
  tokenCompact: string,
): boolean {
  if (field.norm.includes(tokenNorm)) return true;
  if (tokenSpaced && field.spaced.includes(tokenSpaced)) return true;
  if (tokenCompact && field.compact.includes(tokenCompact)) return true;
  return false;
}

export function matchesReceiptSearchIndex(index: ReceiptSearchIndex, query: string): boolean {
  const cleaned = normalizeReceiptSearchText(stripReceiptSearchLabels(query));
  if (!cleaned) return true;

  const fullSpaced = toSpacedSearchForm(cleaned);
  const fullCompact = toCompactSearchForm(cleaned);

  if (fullCompact && index.fields.some((field) => field.compact.includes(fullCompact))) {
    return true;
  }
  if (fullSpaced && index.fields.some((field) => field.spaced.includes(fullSpaced))) {
    return true;
  }

  const rawTokens = cleaned
    .split(/\s+/u)
    .map((token) => token.replace(/^[,;|]+|[,;|]+$/gu, ''))
    .filter(Boolean);

  if (!rawTokens.length) return true;

  const wordTokens = rawTokens.filter((token) => toCompactSearchForm(token).length > 0);
  const effectiveTokens = wordTokens.length > 0 ? wordTokens : rawTokens;

  return effectiveTokens.every((token) => {
    const tokenSpaced = toSpacedSearchForm(token);
    const tokenCompact = toCompactSearchForm(token);
    return index.fields.some((field) =>
      fieldMatchesToken(field, token, tokenSpaced, tokenCompact),
    );
  });
}

export function matchesReceiptSearch(receipt: ReceiptRecord, query: string): boolean {
  return matchesReceiptSearchIndex(buildReceiptSearchIndex(receipt), query);
}

function normalizeFiscalYearKey(value: string): string {
  return canonicalizeFiscalYearLabel(value) ?? normalizeReceiptSearchText(value);
}

export function filterReceiptRecords(params: {
  records: readonly ReceiptRecord[];
  filters: ReceiptFilters;
  fiscalYear: string;
  systemUsers?: readonly Pick<UserRecord, 'name' | 'email'>[];
  searchIndexMap?: ReadonlyMap<ReceiptRecord, ReceiptSearchIndex>;
}): ReceiptRecord[] {
  const {
    records,
    filters,
    fiscalYear,
    systemUsers = [],
    searchIndexMap,
  } = params;

  const normalizedFiscalYear = fiscalYear === 'all' ? '' : normalizeFiscalYearKey(fiscalYear);

  return records.filter((receipt) => {
    const index = searchIndexMap?.get(receipt) ?? buildReceiptSearchIndex(receipt);
    if (!matchesReceiptSearchIndex(index, filters.search)) return false;

    if (normalizedFiscalYear && normalizeFiscalYearKey(receipt.fiscalYear) !== normalizedFiscalYear) {
      return false;
    }
    if (filters.dateFrom && receipt.paymentDate < filters.dateFrom) return false;
    if (filters.dateTo && receipt.paymentDate > filters.dateTo) return false;
    if (!matchesReceiptBranchFilter(receipt.branchName, filters.branch)) return false;
    if (!matchesReceiptUserFilter(receipt, filters.user, systemUsers)) return false;
    if (filters.status !== 'all' && receipt.status !== filters.status) return false;

    return true;
  });
}
