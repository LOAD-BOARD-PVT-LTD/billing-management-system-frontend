'use client';

import { useMemo, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTqmsVehicleTypes } from '@/features/vehicle/mappings/tqms-vehicle-type/hooks/useTqmsVehicleTypes';

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
  const [optionsVisible, setOptionsVisible] = useState(false);
  const { data, error, isLoading, isRefreshing, isSyncing, reload, sync } = useTqmsVehicleTypes(enabled && optionsVisible);

  const filteredTypes = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return data;
    return data.filter((option) => `${option.name} ${option.code}`.toLowerCase().includes(query));
  }, [data, searchTerm]);

  const toggleType = (id: string) => {
    if (selectedTypeIds.includes(id)) {
      onSelectionChange(selectedTypeIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onSelectionChange(selectionMode === 'single' ? [id] : [...selectedTypeIds, id]);
    if (selectionMode === 'single') {
      setOptionsVisible(false);
    }
  };

  const selectedLabels = selectedTypeIds.map((id) => ({
    id,
    name: data.find((option) => option.id === id)?.name ?? id,
  }));

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-800">TQMS सवारी प्रकार</div>
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px]">
            {selectedTypeIds.length} चयन
          </Badge>
        </div>

        {selectedLabels.length > 0 && (
          <div className="mt-2 max-h-16 overflow-y-auto rounded-lg border border-blue-200 bg-blue-50/70 p-1.5">
            <div className="flex flex-wrap gap-1.5">
              {selectedLabels.map((type) => (
                <span
                  key={type.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-blue-900 shadow-sm"
                >
                  <span className="truncate">{type.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleType(type.id)}
                    className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-blue-600 hover:bg-blue-100 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`${type.name} हटाउनुहोस्`}
                    title="Remove selection"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onFocus={() => setOptionsVisible(true)}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setOptionsVisible(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOptionsVisible(false);
            }}
            placeholder="TQMS प्रकार खोज्नुहोस्..."
            className="border-slate-200 bg-slate-50 pl-9 text-sm"
            disabled={!enabled}
          />
        </div>

        {optionsVisible && (
          <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-2 py-1.5">
              <span className="text-[10px] text-muted-foreground">{data.length} प्रकार</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="gap-1"
                  onClick={() => void sync().catch(() => undefined)}
                  loading={isSyncing}
                  disabled={!enabled || isLoading || isRefreshing}
                  title="Sync vehicle types from TQMS"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sync TQMS
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="gap-1"
                  onClick={() => void reload()}
                  disabled={!enabled || isLoading || isSyncing}
                  loading={isRefreshing}
                  aria-label="Refresh TQMS vehicle types"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7"
                  onClick={() => setOptionsVisible(false)}
                  aria-label="Hide TQMS vehicle types"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto p-1">
              {isLoading ? (
                <div className="flex min-h-[52px] items-center justify-center text-xs text-slate-500">
                  TQMS प्रकार लोड हुँदैछ...
                </div>
              ) : error ? (
                <div className="flex min-h-[52px] flex-col items-center justify-center gap-1 px-3 text-center text-xs text-red-600">
                  <span>TQMS प्रकार लोड भएन: {error}</span>
                  <Button type="button" variant="ghost" size="xs" onClick={() => void reload()} loading={isRefreshing}>
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
                        className={`flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition ${
                          selected
                            ? 'border-blue-300 bg-blue-50 shadow-sm'
                            : unavailable
                              ? 'cursor-not-allowed border-transparent bg-slate-50 opacity-60'
                              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                          <span className="truncate text-xs font-medium text-slate-800">{option.name}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-[10px] text-slate-500">
                          {assignedCategory
                            ? `म्याप: ${assignedCategory}`
                            : option.vehicleCount !== undefined
                              ? `${option.vehicleCount} vehicles`
                              : option.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[52px] items-center justify-center text-xs text-slate-500">
                  {data.length === 0 ? 'कुनै TQMS प्रकार उपलब्ध छैन।' : 'कुनै TQMS प्रकार भेटिएन।'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}