import type { BillResourceContent } from '@/features/billing/model/bill.types';

export type DuplicateBillMatch = {
  existingBillId: string;
  receiptNumber: string;
  vehicleNumber: string;
  branchName: string;
  paymentDate: string;
  periodStart: string;
  periodEnd: string;
  feeHeadId: string;
  feeTitle: string;
  billingEntityId: string;
  billingEntity: string;
  ruleId: string | null;
  existingAmount: number;
  status?: string;
};

type ExistingBillLike = {
  id?: string | number;
  receiptNumber?: string;
  status?: string;
  bill?: { content?: BillResourceContent };
  content?: BillResourceContent;
  vehicleNumber?: string;
  branchName?: string;
  paymentDate?: string;
  validUntil?: string;
};

function normalizeComparableId(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
}

function normalizeDateKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = raw.match(/^\d{4}-\d{2}-\d{2}$/u);
  if (match) return raw;
  const parsed = new Date(`${raw}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return raw;
}

function extractContent(record: ExistingBillLike): BillResourceContent | null {
  const fromBill = record.bill?.content ?? null;
  if (fromBill) return fromBill;
  if (record.content) return record.content;
  return null;
}

function shouldMatchExistingBill(newBill: Pick<BillResourceContent, 'vehicle' | 'branch' | 'fiscalYearId' | 'periodStart' | 'periodEnd'>, existingBill: ExistingBillLike): boolean {
  const existingContent = extractContent(existingBill);
  if (!existingContent) return false;

  const vehicleMatch = !normalizeComparableId(newBill.vehicle?.id)
    || !normalizeComparableId(existingContent.vehicle?.id)
    || normalizeComparableId(newBill.vehicle?.id) === normalizeComparableId(existingContent.vehicle?.id);
  const branchMatch = !normalizeComparableId(newBill.branch?.id)
    || !normalizeComparableId(existingContent.branch?.id)
    || normalizeComparableId(newBill.branch?.id) === normalizeComparableId(existingContent.branch?.id);
  const fiscalYearMatch = !normalizeComparableId(newBill.fiscalYearId)
    || !normalizeComparableId(existingContent.fiscalYearId)
    || normalizeComparableId(newBill.fiscalYearId) === normalizeComparableId(existingContent.fiscalYearId);
  const periodMatch = !normalizeDateKey(newBill.periodStart)
    || !normalizeDateKey(existingContent.periodStart)
    || !normalizeDateKey(newBill.periodEnd)
    || !normalizeDateKey(existingContent.periodEnd)
    || (normalizeDateKey(newBill.periodStart) === normalizeDateKey(existingContent.periodStart)
      && normalizeDateKey(newBill.periodEnd) === normalizeDateKey(existingContent.periodEnd));

  return vehicleMatch && branchMatch && fiscalYearMatch && periodMatch;
}

export function findDuplicateBillItems(
  newBill: Pick<BillResourceContent, 'vehicle' | 'branch' | 'fiscalYearId' | 'periodStart' | 'periodEnd' | 'items'>,
  existingBills: ExistingBillLike[],
): DuplicateBillMatch[] {
  if (!newBill || !Array.isArray(newBill.items)) return [];

  const seen = new Set<string>();
  const matches: DuplicateBillMatch[] = [];

  for (const currentBill of existingBills) {
    const existingContent = extractContent(currentBill);
    if (!existingContent) continue;
    if (!shouldMatchExistingBill(newBill, currentBill)) continue;

    for (const newItem of newBill.items) {
      const newFeeHeadId = normalizeComparableId(newItem.feeHeadId);
      const newEntityId = normalizeComparableId(newItem.billingEntityId);
      const newRuleId = normalizeComparableId(newItem.ruleId ?? '');

      if (!newFeeHeadId || !newEntityId) continue;

      for (const existingItem of existingContent.items ?? []) {
        const existingFeeHeadId = normalizeComparableId(existingItem.feeHeadId);
        const existingEntityId = normalizeComparableId(existingItem.billingEntityId);
        const existingRuleId = normalizeComparableId(existingItem.ruleId ?? '');

        if (newFeeHeadId !== existingFeeHeadId) continue;
        if (newEntityId !== existingEntityId) continue;
        if (newRuleId && existingRuleId && newRuleId !== existingRuleId) continue;
        if (!newRuleId && existingRuleId) continue;
        if (newRuleId && !existingRuleId) continue;

        const existingBillId = normalizeComparableId(currentBill.id ?? existingContent.vehicle?.id ?? '');
        const receiptNumber = currentBill.receiptNumber || existingBillId || '—';
        const matchKey = `${existingBillId}:${newFeeHeadId}:${existingEntityId}:${existingRuleId || 'no-rule'}`;
        if (seen.has(matchKey)) continue;

        matches.push({
          existingBillId,
          receiptNumber,
          vehicleNumber: currentBill.vehicleNumber || existingContent.vehicle?.vehicleNumber || '',
          branchName: currentBill.branchName || existingContent.branch?.name || '',
          paymentDate: currentBill.paymentDate || existingContent.billingDate || existingContent.paidAt || '',
          periodStart: existingContent.periodStart || '',
          periodEnd: existingContent.periodEnd || '',
          feeHeadId: existingItem.feeHeadId || newItem.feeHeadId || '',
          feeTitle: existingItem.title || newItem.title || '',
          billingEntityId: existingItem.billingEntityId || newItem.billingEntityId || '',
          billingEntity: existingItem.billingEntity || newItem.billingEntity || '',
          ruleId: existingItem.ruleId ?? newItem.ruleId ?? null,
          existingAmount: existingItem.amount ?? 0,
          status: currentBill.status,
        });
        seen.add(matchKey);
      }
    }
  }

  return matches.sort((left, right) => left.existingBillId.localeCompare(right.existingBillId) || left.feeHeadId.localeCompare(right.feeHeadId));
}

/**
 * NOTE: keep the matching rules in this pure utility so the same contract can be replicated
 * server-side later without changing the UI or save flow.
 */
