const NEPALI_LOCALE = 'ne-NP';
const ENGLISH_LOCALE = 'en-US';

export interface FormatNumberOptions extends Intl.NumberFormatOptions { 
  source?: 'app' | 'tqms';
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function resolveLocale(source?: 'app' | 'tqms') {
  return source === 'tqms' ? ENGLISH_LOCALE : NEPALI_LOCALE;
}

function getFormatter(locale: string, options: Intl.NumberFormatOptions) {
  const cacheKey = `${locale}-${JSON.stringify(options)}`;
  const cached = formatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, options);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatNumber(
  value: number | bigint,
  { source = 'app', ...options }: FormatNumberOptions = {},
): string {
  const formatter = getFormatter(resolveLocale(source), options);
  return formatter.format(value);
}

export function formatCurrency(
  value: number | bigint,
  {
    source = 'app',
    maximumFractionDigits = 2,
    minimumFractionDigits,
    useNepaliDigits = true,
    ...options
  }: FormatNumberOptions & { useCurrencyCode?: boolean; useNepaliDigits?: boolean } = {},
): string {
                                                                 
  const formatter = getFormatter(resolveLocale(source), {
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
  });
  const formatted = formatter.format(value);
  
                                                                            
  if (source === 'app' && useNepaliDigits) {
    return toNepaliDigits(formatted);
  }
  
  return formatted;
}

export function formatPercent(
  value: number,
  { source = 'app', maximumFractionDigits = 2, minimumFractionDigits, ...options }: FormatNumberOptions = {},
): string {
  const formatter = getFormatter(resolveLocale(source), {
    style: 'percent',
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
  });
  return formatter.format(value);
}

export function formatSignedPercent(
  value: number,
  { source = 'app', maximumFractionDigits = 2, minimumFractionDigits, ...options }: FormatNumberOptions = {},
): string {
  const formatter = getFormatter(resolveLocale(source), {
    style: 'percent',
    signDisplay: 'always',
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
  });
  return formatter.format(value);
}

export function formatCount(
  value: number | bigint,
  { source = 'app', maximumFractionDigits = 0, ...options }: FormatNumberOptions = {},
): string {
  return formatNumber(value, { source, maximumFractionDigits, ...options });
}

export function toNepaliDigits(input: string | number | bigint): string {
  const str = String(input);
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return str.replace(/[0-9]/g, (digit) => nepaliDigits[Number(digit)]);
}
