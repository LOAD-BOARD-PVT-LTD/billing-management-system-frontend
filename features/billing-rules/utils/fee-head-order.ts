import type { FeeHead } from '@/features/billing-rules/model/types';

export function sortFeeHeadsByDisplayOrder(feeHeads: FeeHead[]): FeeHead[] {
  return feeHeads
    .map((feeHead, index) => ({ feeHead, index }))
    .sort((left, right) => (
      (left.feeHead.displayOrder ?? Number.MAX_SAFE_INTEGER)
      - (right.feeHead.displayOrder ?? Number.MAX_SAFE_INTEGER)
      || left.index - right.index
    ))
    .map(({ feeHead }) => feeHead);
}
