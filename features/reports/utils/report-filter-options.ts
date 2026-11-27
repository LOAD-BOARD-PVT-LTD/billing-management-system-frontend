import type { BranchRecord } from '@/features/administration/branches/types/branch.types';
import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { ReportFilterOption } from '@/features/reports/components/ReportFiltersCard';
import { normalizeReportKey } from '@/features/reports/utils/report-format';
import type { User } from '@/types/auth';
import { formatNepaliFiscalYearLabel } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function isDisplayableValue(value: string | null | undefined): boolean {
  const trimmed = String(value ?? '').trim();
  return Boolean(trimmed) && trimmed !== '—';
}

export function canonicalizeReportFiscalYear(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || trimmed === 'all') return trimmed;
  const digitsNormalized = trimmed.replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
  const match = /^(\d{4})\s*[/\-]\s*(\d{2,4})$/u.exec(digitsNormalized);
  if (!match) return trimmed;
  const startYear = Number.parseInt(match[1], 10);
  const trailingRaw = match[2];
  const expectedTwoDigit = (startYear + 1) % 100;
  if (trailingRaw.length === 2) {
    if (Number.parseInt(trailingRaw, 10) !== expectedTwoDigit) return trimmed;
  } else if (Number.parseInt(trailingRaw, 10) !== startYear + 1) {
    return trimmed;
  }
  return formatNepaliFiscalYearLabel(startYear);
}

export function resolveReportFiscalYear(
  fiscalYears: readonly Pick<FiscalYear, 'id' | 'name' | 'code'>[],
  selectedFiscalYear: string,
): Pick<FiscalYear, 'id' | 'name' | 'code'> | undefined {
  if (!selectedFiscalYear || selectedFiscalYear === 'all') return undefined;
  const rawKey = normalizeKey(selectedFiscalYear);
  const canonicalKey = normalizeKey(canonicalizeReportFiscalYear(selectedFiscalYear));

  return fiscalYears.find((year) => {
    const candidates = [year.id, year.name, year.code]
      .filter((item): item is string => Boolean(item))
      .flatMap((item) => [normalizeKey(item), normalizeKey(canonicalizeReportFiscalYear(item))]);
    return candidates.includes(rawKey) || (Boolean(canonicalKey) && candidates.includes(canonicalKey));
  });
}

function getFiscalYearMatchKeys(
  selectedFiscalYear: string,
  fiscalYears: readonly Pick<FiscalYear, 'id' | 'name' | 'code'>[],
): Set<string> {
  const keys = new Set<string>();
  const addKey = (value: string | null | undefined) => {
    const raw = normalizeKey(value);
    const canonical = normalizeKey(canonicalizeReportFiscalYear(value));
    if (raw) keys.add(raw);
    if (canonical) keys.add(canonical);
  };
  addKey(selectedFiscalYear);
  const resolved = resolveReportFiscalYear(fiscalYears, selectedFiscalYear);
  if (resolved) {
    addKey(resolved.id);
    addKey(resolved.name);
    addKey(resolved.code);
  }
  return keys;
}

function collectSortedUnique(values: readonly string[]): string[] {
  const byKey = new Map<string, string>();
  for (const raw of values) {
    if (!isDisplayableValue(raw)) continue;
    const trimmed = raw.trim();
    const key = normalizeKey(trimmed);
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }
  return Array.from(byKey.values()).sort((left, right) => left.localeCompare(right, 'ne'));
}

export function buildReportFiscalYearOptions(params: {
  fiscalYears?: readonly Pick<FiscalYear, 'id' | 'name' | 'code'>[];
  receipts?: readonly Pick<ReceiptRecord, 'fiscalYear'>[];
}): string[] {
  const { fiscalYears = [], receipts = [] } = params;
  return collectSortedUnique([
    ...fiscalYears.map((year) => year.name || year.code || year.id),
    ...receipts.map((receipt) => receipt.fiscalYear),
  ]);
}

export function buildReportBranchOptions(params: {
  receipts?: readonly Pick<ReceiptRecord, 'branchName'>[];
  systemBranches?: readonly Pick<BranchRecord, 'id' | 'name'>[];
  authUser?: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
  systemUsers?: readonly Pick<UserRecord, 'id' | 'email' | 'name' | 'branchId' | 'branchName'>[];
}): string[] {
  const { receipts = [], systemBranches = [], authUser, systemUsers = [] } = params;
  const isNonAdmin = Boolean(authUser?.role && normalizeKey(authUser.role) !== 'admin');

  if (isNonAdmin && authUser) {
    const matchedUser = systemUsers.find((user) => (
      (authUser.id && user.id === authUser.id)
      || (authUser.email && normalizeKey(user.email) === normalizeKey(authUser.email))
      || (authUser.name && normalizeKey(user.name) === normalizeKey(authUser.name))
    ));
    const assignedBranchName = matchedUser?.branchName?.trim()
      || (matchedUser?.branchId
        ? systemBranches.find((branch) => branch.id === matchedUser.branchId)?.name?.trim()
        : undefined);
    if (assignedBranchName) {
      return [assignedBranchName];
    }
  }

  return collectSortedUnique([
    ...systemBranches.map((branch) => branch.name),
    ...receipts.map((receipt) => receipt.branchName),
  ]);
}

export function buildReportUserOptions(params: {
  receipts?: readonly Pick<ReceiptRecord, 'branchName' | 'userName'>[];
  systemUsers?: readonly Pick<UserRecord, 'name' | 'email' | 'branchId' | 'branchName'>[];
  systemBranches?: readonly Pick<BranchRecord, 'id' | 'name'>[];
  selectedBranch?: string;
}): string[] {
  const {
    receipts = [],
    systemUsers = [],
    systemBranches = [],
    selectedBranch = 'all',
  } = params;

  const isBranchScoped = Boolean(selectedBranch && selectedBranch !== 'all');
  const branchKey = normalizeKey(selectedBranch);
  const matchingBranchIds = new Set(
    isBranchScoped
      ? systemBranches
        .filter((branch) => normalizeKey(branch.name) === branchKey)
        .map((branch) => branch.id.trim())
        .filter(Boolean)
      : [],
  );

  const primaryLabels: string[] = [];
  const aliasedEmailKeys = new Set<string>();

  for (const user of systemUsers) {
    const displayName = user.name.trim();
    const email = user.email.trim();
    const primary = displayName || email;
    if (!isDisplayableValue(primary)) continue;

    if (displayName && email && normalizeKey(email) !== normalizeKey(displayName)) {
      aliasedEmailKeys.add(normalizeKey(email));
    }

    if (isBranchScoped) {
      const matchesBranchName = Boolean(user.branchName && normalizeKey(user.branchName) === branchKey);
      const matchesBranchId = Boolean(user.branchId && matchingBranchIds.has(user.branchId.trim()));
      if (!matchesBranchName && !matchesBranchId) continue;
    }

    primaryLabels.push(primary);
  }

  const scopedReceipts = isBranchScoped
    ? receipts.filter((receipt) => normalizeKey(receipt.branchName) === branchKey)
    : receipts;

  const byKey = new Map<string, string>();
  for (const label of primaryLabels) {
    const key = normalizeKey(label);
    if (!byKey.has(key)) byKey.set(key, label);
  }
  for (const receipt of scopedReceipts) {
    if (!isDisplayableValue(receipt.userName)) continue;
    const trimmed = receipt.userName.trim();
    const key = normalizeKey(trimmed);
    if (aliasedEmailKeys.has(key)) continue;
    if (!byKey.has(key)) byKey.set(key, trimmed);
  }

  return Array.from(byKey.values()).sort((left, right) => left.localeCompare(right, 'ne'));
}

export function buildReportFeeHeadOptions(params: {
  billingRuleFeeHeads?: readonly (Pick<FeeHead, 'id'> & { name?: string; title?: string; fiscalYearId?: string | null })[];
  fiscalYears?: readonly Pick<FiscalYear, 'id' | 'name' | 'code'>[];
  receipts?: readonly ReceiptRecord[];
  selectedFiscalYear?: string;
}): ReportFilterOption[] {
  const {
    billingRuleFeeHeads = [],
    fiscalYears = [],
    receipts = [],
    selectedFiscalYear = 'all',
  } = params;

  const isFiscalYearScoped = Boolean(selectedFiscalYear && selectedFiscalYear !== 'all');
  const fyMatchKeys = isFiscalYearScoped
    ? getFiscalYearMatchKeys(selectedFiscalYear, fiscalYears)
    : new Set<string>();

  const matchesFiscalYear = (rawValue: string | null | undefined): boolean => {
    if (!isFiscalYearScoped) return true;
    const rawKey = normalizeKey(rawValue);
    const canonicalKey = normalizeKey(canonicalizeReportFiscalYear(rawValue));
    return (Boolean(rawKey) && fyMatchKeys.has(rawKey))
      || (Boolean(canonicalKey) && fyMatchKeys.has(canonicalKey));
  };

  const feeHeadByKey = new Map<string, ReportFilterOption>();

  for (const head of billingRuleFeeHeads) {
    if (isFiscalYearScoped && !matchesFiscalYear(head.fiscalYearId)) continue;
    const id = String(head.id ?? '').trim();
    const title = String(head.title ?? head.name ?? '').trim();
    if (!id && !title) continue;
    const key = id || normalizeReportKey(title);
    if (!feeHeadByKey.has(key)) {
      feeHeadByKey.set(key, {
        value: id || title,
        label: title || id,
      });
    }
  }

  for (const receipt of receipts) {
    if (isFiscalYearScoped) {
      const receiptMatches = matchesFiscalYear(receipt.fiscalYear)
        || matchesFiscalYear(receipt.bill.content.fiscalYearId)
        || matchesFiscalYear(receipt.bill.content.fiscalYearName);
      if (!receiptMatches) continue;
    }
    for (const item of receipt.bill.content.items) {
      const id = String(item.feeHeadId ?? '').trim();
      const title = String(item.title ?? '').trim();
      if (!id && !title) continue;
      const key = id || normalizeReportKey(title);
      if (!feeHeadByKey.has(key)) {
        feeHeadByKey.set(key, {
          value: id || title,
          label: title || id,
        });
      }
    }
  }

  return Array.from(feeHeadByKey.values()).sort((left, right) => left.label.localeCompare(right.label, 'ne'));
}

export function matchesReportUserFilter(
  rowUserName: string,
  selectedUser: string,
  systemUsers: readonly Pick<UserRecord, 'name' | 'email'>[] = [],
): boolean {
  if (!selectedUser || selectedUser === 'all') return true;
  const targetKey = normalizeKey(selectedUser);
  const acceptedKeys = new Set<string>([targetKey]);

  for (const user of systemUsers) {
    const nameKey = normalizeKey(user.name);
    const emailKey = normalizeKey(user.email);
    if ((nameKey && nameKey === targetKey) || (emailKey && emailKey === targetKey)) {
      if (nameKey) acceptedKeys.add(nameKey);
      if (emailKey) acceptedKeys.add(emailKey);
    }
  }

  const rowKey = normalizeKey(rowUserName);
  return Boolean(rowKey) && acceptedKeys.has(rowKey);
}
