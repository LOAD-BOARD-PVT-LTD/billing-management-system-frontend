import type { FeeHead } from '@/features/billing-rules/model/types';

function normalizeFeeHeadName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

export function assertUniqueFeeHeadNames(feeHeads: FeeHead[]): void {
  const feeHeadByYearAndName = new Map<string, FeeHead>();

  for (const feeHead of feeHeads) {
    const normalizedName = normalizeFeeHeadName(feeHead.name);
    if (!normalizedName) continue;

    const fiscalYearId = feeHead.fiscalYearId?.trim() ?? '';
    const uniqueKey = `${fiscalYearId}\u0000${normalizedName}`;
    const existing = feeHeadByYearAndName.get(uniqueKey);
    if (existing && existing.id !== feeHead.id) {
      throw new Error(`"${feeHead.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
    }
    feeHeadByYearAndName.set(uniqueKey, feeHead);
  }
}


