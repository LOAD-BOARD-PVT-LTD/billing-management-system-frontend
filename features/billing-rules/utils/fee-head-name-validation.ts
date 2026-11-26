import type { FeeHead } from '@/features/billing-rules/model/types';
import { formatNepaliFiscalYearLabel } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export type FiscalYearIdentityResolver = (value: string | null) => string;

export function normalizeFeeHeadName(name: string): string {
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase();
}

function canonicalizeFiscalYearText(value: string): string | null {
  const digitsNormalized = value
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .trim()
    .replace(/[०-९]/gu, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
  const match = /^(\d{4})\s*[/\-]\s*(\d{2,4})$/u.exec(digitsNormalized);
  if (!match) return null;
  const startYear = Number.parseInt(match[1], 10);
  const trailingRaw = match[2];
  const expectedTwoDigit = (startYear + 1) % 100;
  if (trailingRaw.length === 2) {
    if (Number.parseInt(trailingRaw, 10) !== expectedTwoDigit) return null;
  } else if (trailingRaw.length === 4) {
    if (Number.parseInt(trailingRaw, 10) !== startYear + 1) return null;
  } else {
    return null;
  }
  return formatNepaliFiscalYearLabel(startYear);
}

export function normalizeFiscalYear(
  fiscalYearId: string | null | undefined,
  resolveFiscalYearId?: FiscalYearIdentityResolver,
): string {
  if (!fiscalYearId) return '';
  const resolved = resolveFiscalYearId ? resolveFiscalYearId(fiscalYearId) : fiscalYearId;
  const trimmed = resolved.trim();
  if (!trimmed) return '';
  return canonicalizeFiscalYearText(trimmed) ?? trimmed;
}

export function buildFeeHeadIdentityKey(
  feeHead: Pick<FeeHead, 'name' | 'fiscalYearId'>,
  resolveFiscalYearId?: FiscalYearIdentityResolver,
): string {
  return `${normalizeFiscalYear(feeHead.fiscalYearId, resolveFiscalYearId)}\u0000${normalizeFeeHeadName(feeHead.name)}`;
}

export function findDuplicateFeeHead(
  feeHeads: readonly FeeHead[],
  candidate: Pick<FeeHead, 'id' | 'name' | 'fiscalYearId'>,
  resolveFiscalYearId?: FiscalYearIdentityResolver,
): FeeHead | undefined {
  const candidateName = normalizeFeeHeadName(candidate.name);
  if (!candidateName) return undefined;
  const candidateYear = normalizeFiscalYear(candidate.fiscalYearId, resolveFiscalYearId);

  return feeHeads.find((other) => (
    other.id !== candidate.id
    && normalizeFiscalYear(other.fiscalYearId, resolveFiscalYearId) === candidateYear
    && normalizeFeeHeadName(other.name) === candidateName
  ));
}

function isFeeHeadIdentityChanged(
  current: FeeHead,
  previous: FeeHead | undefined,
  resolveFiscalYearId?: FiscalYearIdentityResolver,
): boolean {
  if (!previous) return true;
  return (
    normalizeFeeHeadName(current.name) !== normalizeFeeHeadName(previous.name)
    || normalizeFiscalYear(current.fiscalYearId, resolveFiscalYearId)
      !== normalizeFiscalYear(previous.fiscalYearId, resolveFiscalYearId)
  );
}

export function assertUniqueFeeHeadNames(
  feeHeads: FeeHead[],
  previousFeeHeads?: FeeHead[],
  resolveFiscalYearId?: FiscalYearIdentityResolver,
): void {
  if (!previousFeeHeads) {
    const feeHeadByYearAndName = new Map<string, FeeHead>();

    for (const feeHead of feeHeads) {
      const normalizedName = normalizeFeeHeadName(feeHead.name);
      if (!normalizedName) continue;

      const uniqueKey = buildFeeHeadIdentityKey(feeHead, resolveFiscalYearId);
      const existing = feeHeadByYearAndName.get(uniqueKey);
      if (existing && existing.id !== feeHead.id) {
        throw new Error(`"${feeHead.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
      }
      feeHeadByYearAndName.set(uniqueKey, feeHead);
    }
    return;
  }

  const previousById = new Map(previousFeeHeads.map((item) => [item.id, item]));
  for (const candidate of feeHeads) {
    const previous = previousById.get(candidate.id);
    if (isFeeHeadIdentityChanged(candidate, previous, resolveFiscalYearId)) {
      if (findDuplicateFeeHead(feeHeads, candidate, resolveFiscalYearId)) {
        throw new Error(`"${candidate.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
      }
      continue;
    }

    if (previous?.status === 'INACTIVE' && candidate.status === 'ACTIVE') {
      const activeFeeHeads = feeHeads.filter((other) => other.status === 'ACTIVE');
      if (findDuplicateFeeHead(activeFeeHeads, candidate, resolveFiscalYearId)) {
        throw new Error(`"${candidate.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`);
      }
    }
  }
}
