import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export function formatBranchReceiptNumber(branchCode: string | null | undefined, receiptId: string | null | undefined): string {
  const code = String(branchCode ?? '').trim().replace(/\.+$/u, '');
  const id = String(receiptId ?? '').trim();
  if (!code) throw new Error('Receipt number cannot be created without a branch code.');
  if (!id) throw new Error('Receipt number cannot be created without a bill resource ID.');
  return `${code}.${id}`;
}

export function formatReceiptNumberWithFiscalYear(
  receiptNumber: string | null | undefined,
  fiscalYear: string | null | undefined,
): string {
  const receipt = String(receiptNumber ?? '').trim();
  if (!receipt) return '';

  const year = String(fiscalYear ?? '').trim();
  if (!year) return receipt;

  return `${receipt} (${formatFiscalYearForDisplay(year)})`;
}
