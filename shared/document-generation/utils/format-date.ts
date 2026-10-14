import { convertADtoBS } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export function formatDocumentNepaliDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return toNepaliDigits(value.replaceAll('-', '/'));
  try {
    return toNepaliDigits(convertADtoBS(date).replaceAll('-', '/'));
  } catch {
    return toNepaliDigits(value.replaceAll('-', '/'));
  }
}

export function formatDocumentEnglishDate(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu',
  }).format(date);
}

export function formatDocumentTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ne-NP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Kathmandu',
  }).format(date);
}
