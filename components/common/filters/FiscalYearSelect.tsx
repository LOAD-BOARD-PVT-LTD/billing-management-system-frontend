'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  formatFiscalYearForDisplay,
  generateNepaliFiscalYearOptions,
} from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { useTranslations } from '@/utils/translations';
import { cn } from '@/utils/cn';
import { useId, useMemo } from 'react';
import { DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS } from '@/features/settings/api/fiscal-year-selector.api';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';

const EMPTY_ARCHIVED_YEARS: string[] = [];

interface FiscalYearSelectProps {
  value: string | undefined;
  onChange: (fiscalYear: string) => void;
  optionsOverride?: Array<{ value: string; label?: string; isCurrent?: boolean; isPrevious?: boolean }>;
  className?: string;
  containerClassName?: string;
  id?: string;
  layout?: 'inline' | 'stacked';
  includeAllOption?: boolean;
  yearsBack?: number;
  yearsForward?: number;
  archivedYears?: string[];
}

export function FiscalYearSelect({
  value,
  onChange,
  optionsOverride,
  className,
  containerClassName,
  id,
  layout = 'inline',
  includeAllOption = true,
  yearsBack,
  yearsForward,
  archivedYears,
}: FiscalYearSelectProps) {
  const { t } = useTranslations();
  const { settings } = useFiscalYearSelectorSettings();
  const reactId = useId();
  const selectId = id ?? `fiscal-year-select-${reactId}`;

  const effectiveYearsBack = yearsBack ?? settings?.yearsBack ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS.yearsBack;
  const effectiveYearsForward = yearsForward ?? settings?.yearsForward ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS.yearsForward;
  const effectiveArchivedYears = archivedYears ?? settings?.archivedYears ?? EMPTY_ARCHIVED_YEARS;

                                                                        
                                                                
  const generatedOptions = useMemo(
    () =>
      generateNepaliFiscalYearOptions({
        yearsBack: effectiveYearsBack,
        yearsForward: effectiveYearsForward,
        archivedYears: effectiveArchivedYears,
        useNepaliNumerals: false,                                           
      }),
    [effectiveYearsBack, effectiveYearsForward, effectiveArchivedYears],
  );
  const options = useMemo(() => {
    const overrides = new Map((optionsOverride ?? []).map((option) => [option.value, option]));
    return generatedOptions.map((option) => overrides.get(option) ?? { value: option });
  }, [generatedOptions, optionsOverride]);

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
  };

  const shouldHideLabel =
    className?.includes('[&>label]:hidden') || className?.includes('[&_label]:hidden');
  const triggerClassName = className
    ? className.replace(/\[&>?label\]:hidden\s?/g, '').trim()
    : undefined;

  const labelNode = !shouldHideLabel ? <Label htmlFor={selectId}>{t('forms.fiscalYear')}</Label> : null;
  const selectNode = (
    <Select value={value ?? ''} onValueChange={handleChange}>
      <SelectTrigger id={selectId} aria-label={t('forms.selectFiscalYear')} className={triggerClassName}>
        <SelectValue placeholder={t('forms.selectFiscalYear')} />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && (
          <SelectItem value="all">{t('filters.allFiscalYears') ?? 'सबै वर्ष'}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label ?? formatFiscalYearForDisplay(option.value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (layout === 'stacked') {
    return (
      <div className={cn(shouldHideLabel ? 'space-y-0' : 'space-y-2', containerClassName)}>
        {labelNode}
        {selectNode}
      </div>
    );
  }

  return (
    <>
      {labelNode}
      {selectNode}
    </>
  );
}
