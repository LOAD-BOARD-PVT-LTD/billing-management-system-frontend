'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  normalizeVehicleTypeList,
  type MahasangVehicleTypeGroup,
} from '@/features/settings/api/mahasang-report-settings.api';
import { toNepaliDigits } from '@/utils/numbers';

export interface VehicleTypeMultiSelectProps {
  id: string;
  label?: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
  groups?: readonly MahasangVehicleTypeGroup[];
  defaultVehicleTypes?: readonly string[];
}

function sameTypeSet(left: readonly string[], right: readonly string[]): boolean {
  const leftKeys = new Set(left.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean));
  const rightKeys = new Set(right.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean));
  if (leftKeys.size !== rightKeys.size) return false;
  for (const key of leftKeys) {
    if (!rightKeys.has(key)) return false;
  }
  return true;
}

export function VehicleTypeMultiSelect({
  id,
  label = 'सवारी साधन प्रकार',
  options,
  selected,
  onChange,
  groups = [],
  defaultVehicleTypes = [],
}: VehicleTypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'selected'>('all');

  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => item.trim().toLocaleLowerCase()).filter(Boolean)),
    [selected],
  );

  const searchFilteredOptions = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return options;
    return options.filter((option) => option.toLocaleLowerCase().includes(query));
  }, [options, search]);

  const filteredOptions = useMemo(() => {
    if (viewFilter === 'selected') {
      return searchFilteredOptions.filter((option) => selectedKeys.has(option.trim().toLocaleLowerCase()));
    }
    return searchFilteredOptions;
  }, [searchFilteredOptions, selectedKeys, viewFilter]);

  const triggerText = useMemo(() => {
    if (selected.length === 0) return 'सबै प्रकार';
    if (selected.length === 1) return selected[0];
    return `${toNepaliDigits(selected.length)} प्रकार छानिएको`;
  }, [selected]);

  const toggleOption = (value: string, checked: boolean) => {
    const key = value.trim().toLocaleLowerCase();
    if (checked) {
      if (selectedKeys.has(key)) return;
      onChange([...selected, value]);
      return;
    }
    onChange(selected.filter((item) => item.trim().toLocaleLowerCase() !== key));
  };

  const handleSelectAllOrVisible = () => {
    if (search.trim()) {
      onChange(normalizeVehicleTypeList([...selected, ...searchFilteredOptions]));
      return;
    }
    onChange([...options]);
  };

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between bg-background px-3 font-normal text-foreground"
          >
            <span className="truncate">{triggerText}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-2.5 p-3 sm:w-96">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="सवारी प्रकार खोज्नुहोस्..."
              aria-label="सवारी प्रकार खोज्नुहोस्"
              className="h-8 pl-8 pr-8 text-xs"
            />
            {search ? (
              <button
                type="button"
                aria-label="खोज हटाउनुहोस्"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1 rounded-md border border-border/70 bg-muted/20 p-0.5">
            <Button
              type="button"
              size="xs"
              variant={viewFilter === 'all' ? 'secondary' : 'ghost'}
              className="flex-1"
              onClick={() => setViewFilter('all')}
            >
              सबै ({toNepaliDigits(options.length)})
            </Button>
            <Button
              type="button"
              size="xs"
              variant={viewFilter === 'selected' ? 'secondary' : 'ghost'}
              className="flex-1"
              onClick={() => setViewFilter('selected')}
            >
              छानिएका ({toNepaliDigits(selected.length)})
            </Button>
          </div>

          {groups.length > 0 ? (
            <div className="space-y-1.5 border-b border-border/70 pb-2">
              <p className="text-[11px] font-medium text-muted-foreground">एडमिन समूहहरू</p>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((group) => {
                  const isActive = sameTypeSet(selected, group.vehicleTypes);
                  return (
                    <Button
                      key={group.id}
                      type="button"
                      size="xs"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => onChange([...group.vehicleTypes])}
                    >
                      {group.name} ({toNepaliDigits(group.vehicleTypes.length)})
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={handleSelectAllOrVisible}
                disabled={options.length === 0 || (Boolean(search.trim()) && searchFilteredOptions.length === 0)}
              >
                {search.trim() ? 'देखिएका छान्नुहोस्' : 'सबै छान्नुहोस्'}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => onChange([])}
                disabled={selected.length === 0}
              >
                खाली गर्नुहोस्
              </Button>
            </div>
            {defaultVehicleTypes.length > 0 && !sameTypeSet(selected, defaultVehicleTypes) ? (
              <Button
                type="button"
                size="xs"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => onChange([...defaultVehicleTypes])}
              >
                डिफल्ट लागू गर्नुहोस्
              </Button>
            ) : null}
          </div>

          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {filteredOptions.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">
                सवारी प्रकार फेला परेन।
              </p>
            ) : filteredOptions.map((option) => {
              const checked = selectedKeys.has(option.trim().toLocaleLowerCase());
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs ${
                    checked
                      ? 'bg-primary/5 font-medium text-foreground'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleOption(option, value === true)}
                  />
                  <span className="min-w-0 truncate" title={option}>{option}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
