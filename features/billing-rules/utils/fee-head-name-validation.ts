import type { FeeHead } from '@/features/billing-rules/model/types';

function normalizeFeeHeadName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();
}

function normalizeFiscalYear(fiscalYearId: string | null | undefined): string {
  return fiscalYearId?.trim() ?? '';
}

function isFeeHeadIdentityChanged(current: FeeHead, previous: FeeHead | undefined): boolean {
  if (!previous) return true;
  return (
    normalizeFeeHeadName(current.name) !== normalizeFeeHeadName(previous.name)
    || normalizeFiscalYear(current.fiscalYearId) !== normalizeFiscalYear(previous.fiscalYearId)
  );
}

export function assertUniqueFeeHeadNames(
  feeHeads: FeeHead[],
  previousFeeHeads?: FeeHead[],
): void {
  if (!previousFeeHeads) {
    const feeHeadByYearAndName = new Map<string, FeeHead>();

    for (const feeHead of feeHeads) {
      const normalizedName = normalizeFeeHeadName(feeHead.name);
      if (!normalizedName) continue;

      const fiscalYearId = normalizeFiscalYear(feeHead.fiscalYearId);
      const uniqueKey = `${fiscalYearId}\u0000${normalizedName}`;
      const existing = feeHeadByYearAndName.get(uniqueKey);
      if (existing && existing.id !== feeHead.id) {
        throw new Error(`"${feeHead.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
      }
      feeHeadByYearAndName.set(uniqueKey, feeHead);
    }
    return;
  }

  const previousById = new Map(previousFeeHeads.map((item) => [item.id, item]));
  const changedFeeHeads = feeHeads.filter((feeHead) =>
    isFeeHeadIdentityChanged(feeHead, previousById.get(feeHead.id)),
  );
  if (changedFeeHeads.length === 0) return;

  for (const candidate of changedFeeHeads) {
    const candidateName = normalizeFeeHeadName(candidate.name);
    if (!candidateName) continue;
    const candidateYear = normalizeFiscalYear(candidate.fiscalYearId);

    const duplicate = feeHeads.find((other) => (
      other.id !== candidate.id
      && normalizeFiscalYear(other.fiscalYearId) === candidateYear
      && normalizeFeeHeadName(other.name) === candidateName
    ));
    if (duplicate) {
      throw new Error(`"${candidate.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
    }
  }
}
