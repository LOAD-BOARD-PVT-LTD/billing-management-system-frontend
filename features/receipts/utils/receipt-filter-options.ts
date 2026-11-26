import type { BranchRecord } from '@/features/administration/branches/types/branch.types';
import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

function normalizeOptionKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function isDisplayableOption(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && trimmed !== '—';
}

function collectUniqueOptions(
  primaryValues: readonly string[],
  secondaryValues: readonly string[],
  skipKeys: ReadonlySet<string> = new Set(),
): string[] {
  const optionByKey = new Map<string, string>();

  for (const raw of primaryValues) {
    if (!isDisplayableOption(raw)) continue;
    const trimmed = raw.trim();
    const key = normalizeOptionKey(trimmed);
    if (!optionByKey.has(key)) {
      optionByKey.set(key, trimmed);
    }
  }

  for (const raw of secondaryValues) {
    if (!isDisplayableOption(raw)) continue;
    const trimmed = raw.trim();
    const key = normalizeOptionKey(trimmed);
    if (skipKeys.has(key)) continue;
    if (!optionByKey.has(key)) {
      optionByKey.set(key, trimmed);
    }
  }

  return Array.from(optionByKey.values()).sort((left, right) => left.localeCompare(right, 'ne'));
}

export function buildReceiptFilterOptions(
  records: readonly Pick<ReceiptRecord, 'branchName' | 'userName'>[],
  systemBranches: readonly Pick<BranchRecord, 'name'>[] = [],
  systemUsers: readonly Pick<UserRecord, 'name' | 'email'>[] = [],
): { branches: string[]; users: string[] } {
  const branches = collectUniqueOptions(
    systemBranches.map((branch) => branch.name),
    records.map((record) => record.branchName),
  );

  const primaryUserLabels: string[] = [];
  const aliasedEmailKeys = new Set<string>();

  for (const user of systemUsers) {
    const displayName = user.name.trim();
    const email = user.email.trim();
    const primary = displayName || email;
    if (!isDisplayableOption(primary)) continue;
    primaryUserLabels.push(primary);
    if (displayName && email && normalizeOptionKey(email) !== normalizeOptionKey(displayName)) {
      aliasedEmailKeys.add(normalizeOptionKey(email));
    }
  }

  const users = collectUniqueOptions(
    primaryUserLabels,
    records.map((record) => record.userName),
    aliasedEmailKeys,
  );

  return { branches, users };
}

export function matchesReceiptBranchFilter(
  receiptBranchName: string,
  selectedBranch: string,
): boolean {
  if (!selectedBranch || selectedBranch === 'all') return true;
  return normalizeOptionKey(receiptBranchName) === normalizeOptionKey(selectedBranch);
}

export function matchesReceiptUserFilter(
  receipt: Pick<ReceiptRecord, 'userName' | 'bill'>,
  selectedUser: string,
  systemUsers: readonly Pick<UserRecord, 'name' | 'email'>[] = [],
): boolean {
  if (!selectedUser || selectedUser === 'all') return true;
  const targetKey = normalizeOptionKey(selectedUser);

  const acceptedKeys = new Set<string>([targetKey]);
  for (const user of systemUsers) {
    const nameKey = normalizeOptionKey(user.name);
    const emailKey = normalizeOptionKey(user.email);
    if ((nameKey && nameKey === targetKey) || (emailKey && emailKey === targetKey)) {
      if (nameKey) acceptedKeys.add(nameKey);
      if (emailKey) acceptedKeys.add(emailKey);
    }
  }

  const candidates = [
    receipt.userName,
    receipt.bill?.content?.createdBy?.name,
    receipt.bill?.content?.createdBy?.username,
  ];
  return candidates.some((candidate) => {
    const key = normalizeOptionKey(candidate);
    return Boolean(key) && acceptedKeys.has(key);
  });
}
