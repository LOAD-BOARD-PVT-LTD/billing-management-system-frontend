import {
  BS_CALENDAR_EPOCH_AD_ISO,
  BS_CALENDAR_MAX_YEAR,
  BS_CALENDAR_MIN_YEAR,
  BS_MONTH_DAYS,
} from '@/utils/nepali-calender-dates/bs-calender-data';

export {
  BS_CALENDAR_MAX_YEAR as BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR,
  BS_CALENDAR_MIN_YEAR as BIKRAM_SAMBAT_MIN_SUPPORTED_YEAR,
};

export interface BikramSambatDate {
  year: number;
  month: number;
  day: number;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toIsoString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatBsDateParts(bsDate: BikramSambatDate): string {
  return `${bsDate.year}-${pad2(bsDate.month)}-${pad2(bsDate.day)}`;
}

function parseBikramSambatDateParts(dateString: string): BikramSambatDate | null {
  const parts = dateString.replace(/\//gu, '-').split('-');
  if (parts.length !== 3) return null;

  const year = Number.parseInt(parts[0] ?? '', 10);
  const month = Number.parseInt(parts[1] ?? '', 10);
  const day = Number.parseInt(parts[2] ?? '', 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;

  return { year, month, day };
}

function dayNumberFromIsoDate(isoDate: string): number {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  const day = Number.parseInt(dayStr ?? '', 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new RangeError(`Invalid AD date: ${isoDate}`);
  }

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

function localDateFromDayNumber(dayNumber: number): Date {
  const utcDate = new Date(dayNumber * DAY_IN_MS);
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate());
}

function getMonthDays(year: number): readonly number[] {
  const days = BS_MONTH_DAYS[year];
  if (!days) {
    throw new RangeError(
      `Bikram Sambat year ${year} is outside supported range ${BS_CALENDAR_MIN_YEAR}-${BS_CALENDAR_MAX_YEAR}`,
    );
  }
  return days;
}

function getYearDays(year: number): number {
  return getMonthDays(year).reduce((total, days) => total + days, 0);
}

function validateMonth(month: number) {
  if (month < 1 || month > 12) {
    throw new RangeError(`Invalid Bikram Sambat month: ${month}`);
  }
}

function validateBikramSambatDate(bsDate: BikramSambatDate) {
  validateMonth(bsDate.month);
  const daysInMonth = getDaysInBikramSambatMonth(bsDate.year, bsDate.month);
  if (bsDate.day < 1 || bsDate.day > daysInMonth) {
    throw new RangeError(`Invalid Bikram Sambat date: ${formatBsDateParts(bsDate)}`);
  }
}

   
                                                                                   
   
export function gregorianToBikramSambat(date: Date): BikramSambatDate {
  const targetDayNumber = dayNumberFromIsoDate(toIsoString(date));
  const epochDayNumber = dayNumberFromIsoDate(BS_CALENDAR_EPOCH_AD_ISO);
  let remainingDays = targetDayNumber - epochDayNumber;

  if (remainingDays < 0) {
    throw new RangeError(
      `AD date is before supported Bikram Sambat range starting ${BS_CALENDAR_EPOCH_AD_ISO}`,
    );
  }

  for (let year = BS_CALENDAR_MIN_YEAR; year <= BS_CALENDAR_MAX_YEAR; year += 1) {
    const yearDays = getYearDays(year);
    if (remainingDays >= yearDays) {
      remainingDays -= yearDays;
      continue;
    }

    const monthDays = getMonthDays(year);
    for (let monthIndex = 0; monthIndex < monthDays.length; monthIndex += 1) {
      const days = monthDays[monthIndex] ?? 0;
      if (remainingDays >= days) {
        remainingDays -= days;
        continue;
      }

      return {
        year,
        month: monthIndex + 1,
        day: remainingDays + 1,
      };
    }
  }

  throw new RangeError(
    `AD date is after supported Bikram Sambat range ending ${BS_CALENDAR_MAX_YEAR}-12-${getDaysInBikramSambatMonth(
      BS_CALENDAR_MAX_YEAR,
      12,
    )}`,
  );
}

   
                                                                                   
   
export function bikramSambatToGregorian(bsDate: BikramSambatDate): Date {
  validateBikramSambatDate(bsDate);

  let daysOffset = 0;
  for (let year = BS_CALENDAR_MIN_YEAR; year < bsDate.year; year += 1) {
    daysOffset += getYearDays(year);
  }

  const monthDays = getMonthDays(bsDate.year);
  for (let monthIndex = 0; monthIndex < bsDate.month - 1; monthIndex += 1) {
    daysOffset += monthDays[monthIndex] ?? 0;
  }
  daysOffset += bsDate.day - 1;

  return localDateFromDayNumber(dayNumberFromIsoDate(BS_CALENDAR_EPOCH_AD_ISO) + daysOffset);
}

export function bikramSambatToGregorianIsoDate(bsDate: BikramSambatDate): string {
  return toIsoString(bikramSambatToGregorian(bsDate));
}

export function bikramSambatStringToGregorianIsoDate(dateString: string): string {
  const parsed = parseBikramSambatDate(dateString);
  if (!parsed) {
    throw new RangeError(`Invalid Bikram Sambat date: ${dateString}`);
  }

  return bikramSambatToGregorianIsoDate(parsed);
}

   
                                               
   
export function getDaysInBikramSambatMonth(year: number, month: number): number {
  validateMonth(month);
  return getMonthDays(year)[month - 1] ?? 0;
}

   
                                                    
   
export function formatBikramSambatDate(date: Date): string {
  const bs = gregorianToBikramSambat(date);
  return formatBsDateParts(bs);
}

   
                                                
   
export function parseBikramSambatDate(dateString: string): BikramSambatDate | null {
  const parsed = parseBikramSambatDateParts(dateString);
  if (!parsed) return null;

  try {
    validateBikramSambatDate(parsed);
  } catch {
    return null;
  }

  return parsed;
}
