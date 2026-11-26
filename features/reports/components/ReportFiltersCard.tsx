'use client';

import { FilterX } from 'lucide-react';

import { FiscalYearSelect } from '@/components/common/filters/FiscalYearSelect';
import { Button } from '@/components/ui/button';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MahasangVehicleTypeGroup } from '@/features/settings/api/mahasang-report-settings.api';
import type { IncomeReportDateBasis, IncomeReportFilters } from '@/features/reports/types/income-report';
import { VehicleTypeMultiSelect } from '@/features/reports/components/VehicleTypeMultiSelect';
import { toNepaliDigits } from '@/utils/numbers';

export type ReportFilterOption = { value: string; label: string };

export function toReportDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function fromReportDateValue(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ReportFilterSelect({
  id,
  label,
  value,
  allLabel = 'सबै',
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  allLabel?: string;
  options: readonly ReportFilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">{label}</label>
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 bg-background"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface ReportFiltersCardProps {
  title?: string;
  description?: string;
  ariaLabel?: string;
  idPrefix: string;
  filters: IncomeReportFilters;
  fiscalYears: readonly string[];
  branches: readonly string[];
  feeHeads: readonly ReportFilterOption[];
  users?: readonly string[];
  vehicleTypes?: readonly string[];
  selectedVehicleTypes?: readonly string[];
  vehicleTypeGroups?: readonly MahasangVehicleTypeGroup[];
  defaultVehicleTypes?: readonly string[];
  onVehicleTypesChange?: (next: string[]) => void;
  isFiltered: boolean;
  onUpdate: (key: keyof IncomeReportFilters, value: string | IncomeReportDateBasis) => void;
  onClear: () => void;
  onGenerate?: () => void;
}

export function ReportFiltersCard({
  title = 'रिपोर्ट फिल्टर',
  description = 'शाखा र मितिअनुसार आम्दानी विवरण छान्नुहोस्।',
  ariaLabel = 'रिपोर्ट फिल्टर',
  idPrefix,
  filters,
  fiscalYears,
  branches,
  feeHeads,
  users,
  vehicleTypes,
  selectedVehicleTypes = [],
  vehicleTypeGroups = [],
  defaultVehicleTypes = [],
  onVehicleTypesChange,
  isFiltered,
  onUpdate,
  onClear,
  onGenerate,
}: ReportFiltersCardProps) {
  const fiscalYearOptions = fiscalYears.map((value) => ({ value, label: toNepaliDigits(value) }));
  const showVehicleTypeMultiSelect = Array.isArray(vehicleTypes);
  const showUsersSelect = Array.isArray(users) && !showVehicleTypeMultiSelect;

  return (
    <section aria-label={ariaLabel} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {isFiltered ? (
          <Button type="button" size="sm" variant="ghost" onClick={onClear} className="gap-1.5 text-muted-foreground">
            <FilterX className="h-4 w-4" aria-hidden="true" /> फिल्टर हटाउनुहोस्
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor={`${idPrefix}-fiscal-year`}>वित्तीय वर्ष</label>
          <FiscalYearSelect
            id={`${idPrefix}-fiscal-year`}
            className="[&>label]:hidden"
            value={filters.fiscalYear}
            onChange={(value) => onUpdate('fiscalYear', value)}
            optionsOverride={fiscalYearOptions}
            includeAllOption
          />
        </div>

        <ReportFilterSelect
          id={`${idPrefix}-branch`}
          label="शाखा"
          value={filters.branch}
          allLabel="सबै शाखा"
          options={branches.map((value) => ({ value, label: value }))}
          onChange={(value) => onUpdate('branch', value)}
        />

        <ReportFilterSelect
          id={`${idPrefix}-fee-head`}
          label="आम्दानी शीर्षक"
          value={filters.feeHead}
          allLabel="सबै शीर्षक"
          options={feeHeads}
          onChange={(value) => onUpdate('feeHead', value)}
        />

        {showVehicleTypeMultiSelect ? (
          <VehicleTypeMultiSelect
            id={`${idPrefix}-vehicle-type`}
            options={vehicleTypes}
            selected={selectedVehicleTypes}
            onChange={(next) => onVehicleTypesChange?.(next)}
            groups={vehicleTypeGroups}
            defaultVehicleTypes={defaultVehicleTypes}
          />
        ) : showUsersSelect ? (
          <ReportFilterSelect
            id={`${idPrefix}-user`}
            label="प्रयोगकर्ता"
            value={filters.user}
            allLabel="सबै प्रयोगकर्ता"
            options={users.map((value) => ({ value, label: value }))}
            onChange={(value) => onUpdate('user', value)}
          />
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 border-t border-border/70 pt-3 sm:grid-cols-2 lg:grid-cols-3">
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium text-foreground">बाट मिति</legend>
          <NepaliDatePicker
            value={toReportDateValue(filters.dateFrom)}
            onChange={(date) => onUpdate('dateFrom', fromReportDateValue(date))}
            placeholder="मिति छान्नुहोस्"
          />
        </fieldset>

        <fieldset className="min-w-0 space-y-1.5">
          <legend className="text-xs font-medium text-foreground">सम्म मिति</legend>
          <NepaliDatePicker
            value={toReportDateValue(filters.dateTo)}
            onChange={(date) => onUpdate('dateTo', fromReportDateValue(date))}
            placeholder="मिति छान्नुहोस्"
          />
        </fieldset>

        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${idPrefix}-date-basis`} className="text-xs font-medium text-foreground">मिति आधार</label>
          <Select value={filters.dateBasis} onValueChange={(value) => onUpdate('dateBasis', value)}>
            <SelectTrigger id={`${idPrefix}-date-basis`} className="h-10 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paymentDate">भुक्तानी मिति</SelectItem>
              <SelectItem value="billingDate">मान्य अवधि</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">भुक्तानी मिति वा मान्य अवधि अनुसार रिपोर्ट छान्नुहोस्।</p>
        </div>
      </div>

      {onGenerate ? (
        <div className="mt-4 flex justify-end border-t border-border/70 pt-3">
          <Button type="button" size="sm" onClick={onGenerate} className="gap-2">
            रिपोर्ट तयार गर्नुहोस्
          </Button>
        </div>
      ) : null}
    </section>
  );
}
