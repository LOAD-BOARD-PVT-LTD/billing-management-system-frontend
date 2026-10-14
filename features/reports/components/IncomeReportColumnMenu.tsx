'use client';

import { useMemo, useState } from 'react';
import { Check, Columns3, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  INCOME_REPORT_COLUMN_OPTIONS,
  REQUIRED_INCOME_REPORT_COLUMNS,
  type IncomeReportColumnId,
} from '@/features/reports/utils/income-report-columns';

type IncomeReportColumnMenuProps = {
  visibleColumns: IncomeReportColumnId[];
  onApply: (columns: IncomeReportColumnId[]) => void;
};

export function IncomeReportColumnMenu({ visibleColumns, onApply }: IncomeReportColumnMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(visibleColumns);
  const filteredOptions = useMemo(
    () => INCOME_REPORT_COLUMN_OPTIONS.filter((column) => column.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
    [search],
  );

  const changeOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setSearch('');
    if (nextOpen) setDraft(visibleColumns);
  };

  const toggleColumn = (id: IncomeReportColumnId, checked: boolean) => {
    setDraft((current) => {
      if (REQUIRED_INCOME_REPORT_COLUMNS.includes(id)) return current;
      return checked ? [...current, id] : current.filter((column) => column !== id);
    });
  };

  const selectAll = () => setDraft(INCOME_REPORT_COLUMN_OPTIONS.map((column) => column.id));
  const clearOptional = () => setDraft(REQUIRED_INCOME_REPORT_COLUMNS);
  const resetDraft = () => setDraft(INCOME_REPORT_COLUMN_OPTIONS.filter((column) => column.defaultVisible).map((column) => column.id));

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2 text-xs">
          <Columns3 className="h-4 w-4" aria-hidden="true" />स्तम्भ
          <span className="text-muted-foreground">{visibleColumns.length}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">स्तम्भ देखाउनुहोस्</h2>
            <span className="text-[10px] text-muted-foreground">{draft.length}/{INCOME_REPORT_COLUMN_OPTIONS.length} चयनित</span>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="स्तम्भ खोज्नुहोस्" aria-label="स्तम्भ खोज्नुहोस्" className="h-8 pl-8 text-xs" />
          </div>
          <div className="mt-2 flex gap-3 text-[11px]">
            <button type="button" className="text-primary hover:underline" onClick={selectAll}>सबै छान्नुहोस्</button>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={clearOptional}>ऐच्छिक हटाउनुहोस्</button>
          </div>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
          {filteredOptions.map((column) => {
            const checked = draft.includes(column.id);
            const required = REQUIRED_INCOME_REPORT_COLUMNS.includes(column.id);
            return (
              <label key={column.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/70">
                <Checkbox checked={checked} disabled={required} onCheckedChange={(value) => toggleColumn(column.id, value === true)} />
                <span className="flex-1">{column.label}</span>
                {required ? <span className="text-[9px] text-muted-foreground">अनिवार्य</span> : null}
              </label>
            );
          })}
          {filteredOptions.length === 0 ? <p className="px-2 py-3 text-center text-xs text-muted-foreground">कुनै स्तम्भ भेटिएन।</p> : null}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border p-2">
          <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={resetDraft}>
            <RotateCcw className="h-3 w-3" aria-hidden="true" />पूर्वनिर्धारित
          </Button>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="xs" onClick={() => setOpen(false)}>रद्द</Button>
            <Button type="button" size="xs" className="gap-1" onClick={() => { onApply(draft); setOpen(false); }}>
              <Check className="h-3 w-3" aria-hidden="true" />लागू
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
