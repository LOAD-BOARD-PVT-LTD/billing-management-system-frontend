'use client';

import { FilterX, Search, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReceiptFilters as ReceiptFiltersState, ReceiptRecord } from '@/features/receipts/model/receipt';

function toLocalDateValue(date: Date | undefined) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromLocalDateValue(value: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface ReceiptFiltersProps {
  records: ReceiptRecord[];
  filters: ReceiptFiltersState;
  onUpdate: <K extends keyof ReceiptFiltersState>(key: K, value: ReceiptFiltersState[K]) => void;
  onClear: () => void;
  isFiltered: boolean;
}

export function ReceiptFilters({ records, filters, onUpdate, onClear, isFiltered }: ReceiptFiltersProps) {
  const branches = Array.from(new Set(records.map((record) => record.branchName))).sort();
  const users = Array.from(new Set(records.map((record) => record.userName))).sort();

  return (
    <section aria-label="रसिद खोज तथा फिल्टर" className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,1.6fr)_repeat(2,minmax(10rem,0.75fr))]">
        <div className="space-y-1.5"><label htmlFor="receipt-search" className="text-xs font-medium">खोज</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="receipt-search" type="search" value={filters.search} onChange={(event) => onUpdate('search', event.target.value)} placeholder="सवारी नं. / रसिद नं. / नाम" className="h-10 pl-9" /></div></div>
        <fieldset className="min-w-0 space-y-1.5"><legend className="text-xs font-medium">भु. मिति (बाट)</legend><NepaliDatePicker value={fromLocalDateValue(filters.dateFrom)} onChange={(date) => onUpdate('dateFrom', toLocalDateValue(date))} placeholder="मिति छान्नुहोस्..." /></fieldset>
        <fieldset className="min-w-0 space-y-1.5"><legend className="text-xs font-medium">भु. मिति (सम्म)</legend><NepaliDatePicker value={fromLocalDateValue(filters.dateTo)} onChange={(date) => onUpdate('dateTo', toLocalDateValue(date))} placeholder="मिति छान्नुहोस्..." /></fieldset>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />फिल्टर</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(10rem,1fr))_auto]">
          <div className="space-y-1.5"><label htmlFor="receipt-branch" className="text-xs font-medium">शाखा</label><Select value={filters.branch} onValueChange={(value) => onUpdate('branch', value)}><SelectTrigger id="receipt-branch" className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">सबै शाखा</SelectItem>{branches.map((branch) => <SelectItem key={branch} value={branch}>{branch}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><label htmlFor="receipt-user" className="text-xs font-medium">प्रयोगकर्ता</label><Select value={filters.user} onValueChange={(value) => onUpdate('user', value)}><SelectTrigger id="receipt-user" className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">सबै प्रयोगकर्ता</SelectItem>{users.map((user) => <SelectItem key={user} value={user}>{user}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><label htmlFor="receipt-status" className="text-xs font-medium">स्थिति</label><Select value={filters.status} onValueChange={(value) => onUpdate('status', value)}><SelectTrigger id="receipt-status" className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">सबै स्थिति</SelectItem><SelectItem value="PAID">भुक्तानी</SelectItem><SelectItem value="PENDING">बाँकी</SelectItem><SelectItem value="CANCELLED">रद्द</SelectItem></SelectContent></Select></div>
          <div className="flex items-end"><Button type="button" variant="ghost" size="sm" disabled={!isFiltered} onClick={onClear} className="gap-2 text-muted-foreground"><FilterX className="h-4 w-4" aria-hidden="true" />फिल्टर हटाउनुहोस्</Button></div>
        </div>
      </div>
      {isFiltered ? <div className="mt-2 flex justify-end"><Button type="button" variant="link" size="xs" onClick={onClear}>सबै फिल्टर हटाउनुहोस्</Button></div> : null}
    </section>
  );
}