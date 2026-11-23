'use client';

import { useMemo, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';
import { toNepaliDigits } from '@/utils/numbers';

export function TqmsVehicleTypeSelector({
  enabled,
  selectedTypeIds,
  assignedTypeCategories,
  selectionMode,
  onSelectionChange,
}: {
  enabled: boolean;
  selectedTypeIds: string[];
  assignedTypeCategories?: Record<string, string>;
  selectionMode: 'single' | 'multiple';
  onSelectionChange: (selectedTypeIds: string[]) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const { data, error, isLoading, isRefreshing, isSyncing, reload, sync } = useTqmsVehicleTypes(enabled);

  const filteredTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((option) => {
      if (onlyAvailable && assignedTypeCategories?.[option.id.trim().toLocaleLowerCase()]) {
        return false;
      }
      if (!query) return true;
      return `${option.name} ${option.code}`.toLowerCase().includes(query);
    });
  }, [assignedTypeCategories, data, onlyAvailable, searchTerm]);

  const toggleType = (id: string) => {
    if (selectedTypeIds.includes(id)) {
      onSelectionChange(selectedTypeIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onSelectionChange(selectionMode === 'single' ? [id] : [...selectedTypeIds, id]);
  };

  const selectedLabels = selectedTypeIds.map((id) => ({
    id,
    name: data.find((option) => option.id === id)?.name ?? id,
  }));

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            २
          </span>
          सम्बन्धित TQMS सवारी प्रकार छान्नुहोस्
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={selectedTypeIds.length > 0 ? 'default' : 'secondary'} className="rounded-full px-2.5 py-0.5 text-[11px]">
            {toNepaliDigits(selectedTypeIds.length)} चयन
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-7 gap-1 bg-card"
            onClick={() => void sync().catch(() => undefined)}
            loading={isSyncing}
            disabled={!enabled || isLoading || isRefreshing}
            title="TQMS बाट नयाँ सवारी प्रकार सिंक गर्नुहोस्"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Sync TQMS
          </Button>
        </div>
      </div>

      {selectedLabels.length > 0 && (
        <div className="mt-2.5 max-h-24 overflow-y-auto rounded-lg border border-primary/20 bg-primary/5 p-2">
          <div className="flex flex-wrap gap-1.5">
            {selectedLabels.map((type) => (
              <span
                key={type.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-card px-2.5 py-0.5 text-xs font-medium text-foreground shadow-xs"
              >
                <span className="truncate">{type.name}</span>
                <button
                  type="button"
                  onClick={() => toggleType(type.id)}
                  className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${type.name} हटाउनुहोस्`}
                  title="हटाउनुहोस्"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="TQMS प्रकार खोज्नुहोस्..."
            className="h-9 bg-card pl-9 text-sm"
            disabled={!enabled}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setOnlyAvailable(false)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${!onlyAvailable ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            सबै ({toNepaliDigits(data.length)})
          </button>
          <button
            type="button"
            onClick={() => setOnlyAvailable(true)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${onlyAvailable ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            उपलब्ध मात्र
          </button>
        </div>
      </div>

      <div className="mt-2 overflow-hidden rounded-lg border border-border/80 bg-card">
        <div className="max-h-48 overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex min-h-[72px] items-center justify-center text-xs text-muted-foreground">
              TQMS सवारी प्रकारहरू लोड हुँदैछन्...
            </div>
          ) : error ? (
            <div className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 px-3 text-center text-xs text-destructive">
              <span>TQMS प्रकार लोड भएन: {error}</span>
              <Button type="button" variant="outline" size="xs" onClick={() => void reload()} loading={isRefreshing}>
                फेरि प्रयास गर्नुहोस्
              </Button>
            </div>
          ) : filteredTypes.length > 0 ? (
            <div className="space-y-1">
              {filteredTypes.map((option) => {
                const selected = selectedTypeIds.includes(option.id);
                const assignedCategory = assignedTypeCategories?.[option.id.trim().toLocaleLowerCase()];
                const unavailable = Boolean(assignedCategory);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleType(option.id)}
                    disabled={unavailable}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      selected
                        ? 'border-primary/40 bg-primary/5'
                        : unavailable
                          ? 'cursor-not-allowed border-transparent bg-muted/40 opacity-60'
                          : 'border-transparent bg-card hover:border-border hover:bg-muted/30'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate text-xs font-medium text-foreground">{option.name}</span>
                    </span>
                    <span className="ml-3 shrink-0 text-[11px] text-muted-foreground">
                      {assignedCategory
                        ? `म्याप: ${assignedCategory}`
                        : option.vehicleCount !== undefined
                          ? `${toNepaliDigits(option.vehicleCount)} सवारी`
                          : option.code}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-[72px] items-center justify-center text-xs text-muted-foreground">
              {data.length === 0 ? 'कुनै TQMS प्रकार उपलब्ध छैन। माथिको "Sync TQMS" प्रयोग गर्नुहोस्।' : 'खोजीसँग मिल्ने TQMS प्रकार भेटिएन।'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
