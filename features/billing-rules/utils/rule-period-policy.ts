import type { Frequency, Period, Validity } from '@/features/billing-rules/model/types';

export const validityOptionsByFrequency: Record<Frequency, Array<{ value: Validity; label: string }>> = {
  ONE_TIME: [
    { value: 'SAME_DAY', label: 'सोही दिन' },
    { value: 'END_OF_FISCAL_YEAR', label: 'आर्थिक वर्षको अन्त्य' },
  ],
  PERIODIC: [
    { value: 'SAME_DAY', label: 'अर्को महिनाको सोही दिन' },
    { value: 'END_OF_MONTH', label: 'महिनाको अन्त्य' },
  ],
};

export function getPeriodForFrequency(frequency: Frequency, validity: Validity): Period | null {
  if (frequency === 'PERIODIC') return 'MONTH';
  return validity === 'END_OF_FISCAL_YEAR' ? 'FISCAL_YEAR' : null;
}

export function getValidityForFrequency(frequency: Frequency, validity: Validity): Validity {
  return validityOptionsByFrequency[frequency].some((option) => option.value === validity)
    ? validity
    : 'SAME_DAY';
}

export function getValidityLabel(frequency: Frequency, validity: Validity): string {
  return validityOptionsByFrequency[frequency].find((option) => option.value === validity)?.label ?? '';
}

export function getPeriodLabel(period: Period | null): string {
  if (period === 'MONTH') return 'महिना';
  if (period === 'FISCAL_YEAR') return 'आर्थिक वर्ष';
  return 'लागू हुँदैन';
}
