import { toNepaliDigits } from '@/utils/numbers';
import {
  BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR,
  bikramSambatStringToGregorianIsoDate,
  formatBikramSambatDate,
} from '@/utils/nepali-calender-dates/nepali-date';

export const BIKRAM_SAMBAT_LIBRARY_MAX_BS_YEAR = BIKRAM_SAMBAT_MAX_SUPPORTED_YEAR;
export const BIKRAM_SAMBAT_LIBRARY_WARNING_YEARS = 5;

   
                                                                        
   
export interface NepaliDateParts {
  year: number;
  month: number;
  day: number;
  formatted: string;
}

export interface NepaliDateMetadata {
  bsDate: string;
  fiscalYear: string;
}

   
                                                                
                                                      
                                                     
   
export function convertADtoBS(adDate: Date): string {
  const isoDate = normalizeDate(adDate);
  return formatBikramSambatDate(parseIsoDateToLocalDate(isoDate));
}

   
                                                                                           
                                                      
                                                                                                     
                                                     
   
export function getNepaliFiscalYear(adDate: Date, useNepaliNumerals = false): string {
  const { year, month } = getNepaliDateParts(adDate);
  if (month >= 4) {
    return formatNepaliFiscalYearLabel(year, useNepaliNumerals);
  }
  return formatNepaliFiscalYearLabel(year - 1, useNepaliNumerals);
}

   
                                                                          
   
export function getNepaliDateParts(adDate: Date): NepaliDateParts {
  const bsDate = convertADtoBS(adDate);
  const [yearStr, monthStr, dayStr] = bsDate.split("-");

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    throw new RangeError(`Invalid BS date value derived from ${bsDate}`);
  }

  return {
    year,
    month,
    day,
    formatted: bsDate,
  };
}

   
                                                                      
                                      
                                                                        
                                                                                                                     
   
export function getNepaliDateMetadata(
  adDate: Date | null | undefined,
  useNepaliNumerals = false
): NepaliDateMetadata | null {
  if (!adDate) {
    return null;
  }

  const bs = convertADtoBS(adDate);
  return {
    bsDate: bs,
    fiscalYear: getNepaliFiscalYear(adDate, useNepaliNumerals),
  };
}

function normalizeDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new RangeError('convertADtoBS expected a valid Date instance');
  }
                                                            
                                                                                                 
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Missing date parts');
    }

    return `${year}-${month}-${day}`;
  } catch {
                                                
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

function parseIsoDateToLocalDate(isoDate: string): Date {
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  return new Date(
    Number.parseInt(yearStr, 10),
    Number.parseInt(monthStr, 10) - 1,
    Number.parseInt(dayStr, 10),
  );
}

function formatTrailingYear(year: number): string {
  const truncated = year % 100;
  return truncated.toString().padStart(2, '0');
}

   
                                                           
                                                 
                                                                                                     
   
export function formatNepaliFiscalYearLabel(year: number, useNepaliNumerals = false): string {
  const label = `${year}/${formatTrailingYear(year + 1)}`;
  return useNepaliNumerals ? toNepaliDigits(label) : label;
}

export function generateNepaliFiscalYearOptions(options?: {
  baseDate?: Date;
  yearsBack?: number;
  yearsForward?: number;
  archivedYears?: string[];
  useNepaliNumerals?: boolean;
}): string[] {
  const {
    baseDate = new Date(),
    yearsBack = 3,
    yearsForward = 1,
    archivedYears = [],
    useNepaliNumerals = false,
  } = options ?? {};
  const parts = getNepaliDateParts(baseDate);
  const currentYearStart = parts.month >= 4 ? parts.year : parts.year - 1;

  const start = currentYearStart + yearsForward;
  const end = currentYearStart - yearsBack;

  const years: string[] = [];
  for (let year = start; year >= end; year -= 1) {
    years.push(formatNepaliFiscalYearLabel(year, useNepaliNumerals));
  }

  const canonicalYears = new Set(years.map(toWesternFiscalYear));
  for (const archivedYear of archivedYears) {
    const normalized = toWesternFiscalYear(archivedYear);
    if (!normalized || canonicalYears.has(normalized)) continue;
    canonicalYears.add(normalized);
    years.push(useNepaliNumerals ? toNepaliDigits(normalized) : normalized);
  }

  return years;
}

function toWesternFiscalYear(value: string) {
  return value.trim().replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
}

const NEPALI_MONTHS = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पौष',
  'माघ',
  'फाल्गुण',
  'चैत',
];

export function getNepaliMonthName(month: number, options?: { short?: boolean }): string {
  const name = NEPALI_MONTHS[month - 1] ?? '';
  if (!options?.short || name.length <= 2) {
    return name;
  }
  return name.slice(0, 2);
}

export function formatNepaliMonthYearFromDate(date: Date, options?: { short?: boolean }): string {
  const { year, month } = getNepaliDateParts(date);
  return `${getNepaliMonthName(month, options)} ${year}`;
}

export function formatNepaliMonthYearFromBsDate(
  bsDate: string,
  options?: { short?: boolean }
): string {
  const [yearStr, monthStr] = bsDate.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  return `${getNepaliMonthName(month, options)} ${year}`;
}

   
                                                                          
                                                                               
                                                                   
           
        
                                                                    
      
   
export function convertFiscalYearToNepaliNumerals(fiscalYear: string): string {
  return toNepaliDigits(fiscalYear);
}

   
                                                                          
                                                                                                             
                                                                      
                                                                                                                     
                                                              
   
export function formatFiscalYearForDisplay(
  fiscalYear: string,
  useNepaliNumerals = true
): string {
  if (!useNepaliNumerals) {
    return fiscalYear;
  }
                                                                
                                                         
  const hasNepaliDigits = /[०१२३४५६७८९]/.test(fiscalYear);
  if (hasNepaliDigits) {
    return fiscalYear;                              
  }
  return toNepaliDigits(fiscalYear);
}

   
                                                                                    
                        
   
export function parseFiscalYear(fiscalYear: string): number | null {
  if (!fiscalYear || fiscalYear === 'all') {
    return null;
  }

  const cleaned = fiscalYear.replace(/[०१२३४५६७८९]/g, (char) => {
    const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(nepaliDigits.indexOf(char));
  });

  const match = cleaned.match(/^(\d{4})/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return null;
}

export function isFiscalYearSupportedByBsLibrary(fiscalYear: string): boolean {
  const startYear = parseFiscalYear(fiscalYear);
  return startYear !== null && startYear + 1 <= BIKRAM_SAMBAT_LIBRARY_MAX_BS_YEAR;
}

function shiftAdIsoDate(adIsoDate: string, days: number): string | null {
  const [yearStr, monthStr, dayStr] = adIsoDate.split('-');
  const year = Number.parseInt(yearStr ?? '', 10);
  const month = Number.parseInt(monthStr ?? '', 10);
  const day = Number.parseInt(dayStr ?? '', 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function safeBsToAdIsoDate(bsDate: string): string | null {
  try {
    return bikramSambatStringToGregorianIsoDate(bsDate);
  } catch {
    return null;
  }
}

export function getFiscalYearBsRange(
  fiscalYear: string,
): { fromBs: string; toBs: string } | null {
  if (!isFiscalYearSupportedByBsLibrary(fiscalYear)) {
    return null;
  }
  const startYear = parseFiscalYear(fiscalYear);
  if (startYear === null) return null;

  const nextFiscalYearStartBs = `${startYear + 1}-04-01`;
  const nextFiscalYearStartAd = safeBsToAdIsoDate(nextFiscalYearStartBs);
  if (!nextFiscalYearStartAd) {
    return null;
  }
  const fiscalYearEndAd = shiftAdIsoDate(nextFiscalYearStartAd, -1);
  if (!fiscalYearEndAd) return null;

  const fiscalYearEndBs = formatBikramSambatDate(parseIsoDateToLocalDate(fiscalYearEndAd));
  const [endYearStr, endMonthStr] = fiscalYearEndBs.split('-');
  const endYear = Number.parseInt(endYearStr ?? '', 10);
  const endMonth = Number.parseInt(endMonthStr ?? '', 10);
  if (endYear !== startYear + 1 || endMonth !== 3) {
    return null;
  }

  return {
    fromBs: `${startYear}-04-01`,
    toBs: fiscalYearEndBs,
  };
}

function toInputDate(adDate: string) {
  return adDate.slice(0, 10);
}

export function getFiscalYearInputDateRange(
  fiscalYear: string,
): { from: string; to: string } | null {
  const range = getFiscalYearBsRange(fiscalYear);
  if (!range) return null;
  return {
    from: toInputDate(bikramSambatStringToGregorianIsoDate(range.fromBs)),
    to: toInputDate(bikramSambatStringToGregorianIsoDate(range.toBs)),
  };
}

   
                                                                            
                                                                      
   
export function getFiscalYearDateRange(
  fiscalYear: string,
): { fromDate: Date; toDate: Date } | null {
  const startYear = parseFiscalYear(fiscalYear);
  if (startYear === null) {
    return null;
  }

  const bsStartDate = `${startYear}-01-01`;
  const bsEndDate = `${startYear + 1}-12-30`;

  const adStartStr = bikramSambatStringToGregorianIsoDate(bsStartDate);
  let adEndStr = safeBsToAdIsoDate(bsEndDate);

  if (!adEndStr) {
    adEndStr = safeBsToAdIsoDate(`${startYear + 1}-12-29`);
  }
  if (!adEndStr) {
    adEndStr = safeBsToAdIsoDate(`${startYear + 1}-12-31`);
  }
  if (!adEndStr) {
    adEndStr = safeBsToAdIsoDate(`${startYear + 1}-11-30`);
  }
  if (!adEndStr) return null;

  const fromDate = new Date(adStartStr);
  const toDate = new Date(adEndStr);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

   
                                                      
   
export function getMonthsRangeDateRange(months: number): { fromDate: Date; toDate: Date } {
  const today = new Date();
  const toDate = new Date(today);
  toDate.setHours(23, 59, 59, 999);

  const fromDate = new Date(today);
  fromDate.setMonth(today.getMonth() - months);
  fromDate.setHours(0, 0, 0, 0);

  return { fromDate, toDate };
}
