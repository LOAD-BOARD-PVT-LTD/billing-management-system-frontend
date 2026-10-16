import { formatCurrency, toNepaliDigits } from '@/utils/numbers';
import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export function formatReportDate(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return toNepaliDigits(value.replaceAll('-', '/'));
  try {
    return toNepaliDigits(convertADtoBS(date).replaceAll('-', '/'));
  } catch {
    return toNepaliDigits(value.replaceAll('-', '/'));
  }
}

export function formatReportAmount(value: number): string {
  return toNepaliDigits(formatCurrency(value));
}

export function normalizeReportKey(value: string): string {
  return value.normalize('NFKC').replace(/\s+/gu, '').toLocaleLowerCase();
}
