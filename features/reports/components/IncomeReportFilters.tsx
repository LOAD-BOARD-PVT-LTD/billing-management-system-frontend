'use client';

import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FiscalYearSelect } from '@/components/common/filters/FiscalYearSelect';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  fromReportDateValue,
  ReportFilterSelect,
  toReportDateValue,
  type ReportFilterOption,
} from '@/features/reports/components/ReportFiltersCard';
import type { IncomeReportFilters as IncomeReportFilterValues } from '@/features/reports/types/income-report';
import { toNepaliDigits } from '@/utils/numbers';

type IncomeReportFiltersProps = {
  filters: IncomeReportFilterValues;
  fiscalYears: string[];
  branches: string[];
  users: string[];
  feeHeads: ReportFilterOption[];
  isFiltered: boolean;
  onUpdate: (key: keyof IncomeReportFilterValues, value: string) => void;
  onClear: () => void;
  onGenerate?: () => void;
};

export function IncomeReportFilters({
  filters,
  fiscalYears,
  branches,
  users,
  feeHeads,
  isFiltered,
  onUpdate,
  onClear,
  onGenerate,
}: IncomeReportFiltersProps) {
  const fiscalYearOptions = fiscalYears.map((value) => ({ value, label: toNepaliDigits(value) }));

  return (
    <section aria-label="आम्दानी रिपोर्ट फिल्टर" className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">रिपोर्ट फिल्टर</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">शाखा र मितिअनुसार आम्दानी विवरण छान्नुहोस्।</p>
        </div>
        {isFiltered ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear} className="gap-1.5 text-muted-foreground">
            <FilterX className="h-4 w-4" aria-hidden="true" /> फिल्टर हटाउनुहोस्
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="income-fiscal-year">वित्तीय वर्ष</label>
          <FiscalYearSelect
            id="income-fiscal-year"
            className="[&>label]:hidden"
            value={filters.fiscalYear}
            onChange={(value) => onUpdate('fiscalYear', value)}
            optionsOverride={fiscalYearOptions}
            includeAllOption
          />
        </div>
        <ReportFilterSelect id="income-branch" label="शाखा" value={filters.branch} options={branches.map((value) => ({ value, label: value }))} onChange={(value) => onUpdate('branch', value)} />
        <ReportFilterSelect id="income-user" label="प्रयोगकर्ता" value={filters.user} options={users.map((value) => ({ value, label: value }))} onChange={(value) => onUpdate('user', value)} />
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="income-bill-type" className="text-xs font-medium text-foreground">बिलिङ प्रकार</label>
          <Select value="unavailable" disabled>
            <SelectTrigger id="income-bill-type" className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="unavailable">API मा उपलब्ध छैन</SelectItem></SelectContent>
          </Select>
        </div>
        <ReportFilterSelect id="income-fee-head" label="आम्दानी शीर्षक" value={filters.feeHead} options={feeHeads} onChange={(value) => onUpdate('feeHead', value)} />
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium text-foreground">बाट मिति</legend>
          <NepaliDatePicker value={toReportDateValue(filters.dateFrom)} onChange={(date) => onUpdate('dateFrom', fromReportDateValue(date))} placeholder="मिति छान्नुहोस्" />
        </fieldset>
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium text-foreground">सम्म मिति</legend>
          <NepaliDatePicker value={toReportDateValue(filters.dateTo)} onChange={(date) => onUpdate('dateTo', fromReportDateValue(date))} placeholder="मिति छान्नुहोस्" />
        </fieldset>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">बिलिङ प्रकार छुट्याउने field हालको BillResource मा छैन।</p>
        <div className="flex items-center gap-2 sm:min-w-60">
          <label htmlFor="income-date-basis" className="whitespace-nowrap text-xs font-medium">मिति आधार</label>
          <Select value={filters.dateBasis} onValueChange={(value) => onUpdate('dateBasis', value)}>
            <SelectTrigger id="income-date-basis" className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paymentDate">भुक्तानी मिति</SelectItem>
              <SelectItem value="billingDate">मान्य अवधि</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {onGenerate ? (
          <Button type="button" size="sm" onClick={onGenerate} className="gap-2 sm:ml-auto">
            रिपोर्ट तयार गर्नुहोस्
          </Button>
        ) : null}
      </div>
    </section>
  );
}
