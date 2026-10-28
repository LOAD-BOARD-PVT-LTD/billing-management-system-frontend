'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslations } from '@/utils/translations';

type VehicleBlacklistToolbarProps = {
  search: string;
  canExport: boolean;
  isRefreshing: boolean;
  onSearchChange: (search: string) => void;
  onExport: () => void;
  onRefresh: () => void;
};

export function VehicleBlacklistToolbar({
  search,
  canExport,
  isRefreshing,
  onSearchChange,
  onExport,
  onRefresh,
}: VehicleBlacklistToolbarProps) {
  const { t } = useTranslations();

  return (
    <Card className="shadow-sm hover:shadow-sm">
      <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('vehicleBlacklist.searchPlaceholder')}
            aria-label={t('vehicleBlacklist.searchPlaceholder')}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {t('vehicleBlacklist.refreshAction')}
          </Button>
          <Button type="button" variant="outline" onClick={onExport} disabled={!canExport}>
            <Download className="mr-2 size-4" aria-hidden="true" />
            {t('vehicleBlacklist.exportExcel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
