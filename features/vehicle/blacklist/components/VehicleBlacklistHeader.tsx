'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/utils/translations';

export function VehicleBlacklistHeader({ onAddClick }: { onAddClick: () => void }) {
  const { t } = useTranslations();

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('vehicleBlacklist.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('vehicleBlacklist.description')}</p>
      </div>
    </header>
  );
}
