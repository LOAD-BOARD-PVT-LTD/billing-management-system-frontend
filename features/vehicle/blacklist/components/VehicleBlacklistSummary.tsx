'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { useTranslations } from '@/utils/translations';
import { toNepaliDigits } from '@/utils/numbers';

export function VehicleBlacklistSummary({ records }: { records: VehicleBlacklistRecord[] }) {
  const { t } = useTranslations();
  const blacklistedCount = records.filter((record) => record.isBlacklisted).length;

  return (
    <Card className="shadow-sm hover:shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
        <span className="font-semibold">{t('vehicleBlacklist.totalRecordsLabel')}: {toNepaliDigits(records.length)}</span>
        <Badge variant="destructive">कालोसूची: {toNepaliDigits(blacklistedCount)}</Badge>
      </CardContent>
    </Card>
  );
}
