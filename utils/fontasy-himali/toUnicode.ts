import { convert } from '@nepalibhasha/converter';

function normalizeFontasyHimaliKeys(text: string): string {
  return text.replace(/"/g, '\u00DA').replace(/\?/g, '\u00BF');
}

export function fontasyToUnicode(text: string): string {
  return text ? convert(normalizeFontasyHimaliKeys(text), 'himalb') : '';
}
