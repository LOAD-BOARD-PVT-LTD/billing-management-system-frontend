'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberColumnMenu } from '@/features/members/components/MemberColumnMenu';
import type { MemberColumnId } from '@/features/members/utils/member-table-columns';
import { formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { toNepaliDigits } from '@/utils/numbers';

type FiscalYearOption = { id: string; name: string; code?: string };

type MembersToolbarProps = {
  fiscalYears: FiscalYearOption[];
  fiscalYearId: string;
  fiscalYearName: string;
  totalCount: number;
  visibleCount: number;
  search: string;
  isLoading: boolean;
  canExport: boolean;
  visibleColumns: MemberColumnId[];
  onSearchChange: (search: string) => void;
  onFiscalYearChange: (id: string) => void;
  onExport: () => void;
  onReload: () => void;
  onColumnsChange: (columns: MemberColumnId[]) => void;
};

export function MembersToolbar({
  fiscalYears,
  fiscalYearId,
  fiscalYearName,
  totalCount,
  visibleCount,
  search,
  isLoading,
  canExport,
  visibleColumns,
  onSearchChange,
  onFiscalYearChange,
  onExport,
  onReload,
  onColumnsChange,
}: MembersToolbarProps) {
  return (
    <CardHeader className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <CardTitle className="text-base">सदस्य व्यवस्थापन</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {fiscalYearName} · कुल रेकर्ड: {toNepaliDigits(totalCount)} · देखाइएका: {toNepaliDigits(visibleCount)}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="सदस्य खोज्नुहोस् (नाम, नं., सवारी नं.)..."
            aria-label="सदस्य खोज्नुहोस्"
          />
        </div>
        <Select value={fiscalYearId} onValueChange={onFiscalYearChange}>
          <SelectTrigger className="w-full sm:w-40" aria-label="आर्थिक वर्ष छान्नुहोस्">
            <SelectValue placeholder="आर्थिक वर्ष" />
          </SelectTrigger>
          <SelectContent>
            {fiscalYears.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {formatFiscalYearForDisplay(year.code ?? year.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MemberColumnMenu
          visibleColumns={visibleColumns}
          onApply={onColumnsChange}
        />
        <Button type="button" variant="outline" onClick={onExport} disabled={!canExport}>
          <Download className="mr-2 size-4" aria-hidden="true" />Excel मा निर्यात
        </Button>
        <Button type="button" variant="outline" onClick={onReload} disabled={isLoading}>
          <RefreshCw className={`mr-2 size-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />पुनः लोड
        </Button>
      </div>
    </CardHeader>
  );
}
