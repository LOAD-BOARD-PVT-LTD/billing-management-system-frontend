'use client';

import { Badge } from '@/components/ui/badge';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { useTranslations } from '@/utils/translations';
import { toNepaliDigits } from '@/utils/numbers';

export function VehicleBlacklistSummary({ records }: { records: VehicleBlacklistRecord[] }) {
  const { t } = useTranslations();
  const blacklistedCount = records.filter((record) => record.isBlacklisted).length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
      <span className="font-semibold">{t('vehicleBlacklist.totalRecordsLabel')}: {toNepaliDigits(records.length)}</span>
      <Badge variant="destructive" className="rounded-full">कालोसूची: {toNepaliDigits(blacklistedCount)}</Badge>
    </div>
  );
}
