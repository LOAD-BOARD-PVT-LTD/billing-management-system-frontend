import { getFiscalYearBsRange } from '@/lib/nepali-fiscal-year';

function normalizeBsDate(value: string) {
  return value.trim().replace(/\//g, '-');
}

export function resolveReceiptPeriodFromBs(input: {
  paymentDateBs: string;
  selectedFiscalYear: string;
}): string {
  const range = getFiscalYearBsRange(input.selectedFiscalYear);
  const paymentDateBs = normalizeBsDate(input.paymentDateBs);
  if (!range) return paymentDateBs;
  if (paymentDateBs < range.fromBs || paymentDateBs > range.toBs) return range.fromBs;
  return paymentDateBs;
}
