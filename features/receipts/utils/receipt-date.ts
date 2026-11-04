import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export function formatReceiptDate(value: string): string {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value.replaceAll('/', '-');
  try {
    return convertADtoBS(date).replaceAll('/', '-');
  } catch {
    return value.replaceAll('/', '-');
  }
}
