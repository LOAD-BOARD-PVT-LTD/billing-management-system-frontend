'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { toNepaliDigits } from '@/utils/numbers';
import { useTranslations } from '@/utils/translations';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : toNepaliDigits(date.toLocaleString('ne-NP'));
}

type VehicleBlacklistDetailDialogProps = {
  record: VehicleBlacklistRecord;
  onClose: () => void;
};

export function VehicleBlacklistDetailDialog({ record, onClose }: VehicleBlacklistDetailDialogProps) {
  const { t } = useTranslations();
  const items: Array<[string, string]> = [
    [t('vehicleBlacklist.ownerLabel'), record.ownerName],
    [t('vehicleBlacklist.vehicleTypeLabel'), record.vehicleType],
    [t('vehicleBlacklist.phoneLabel'), record.phone],
    [t('vehicleBlacklist.branchLabel'), record.branch],
    ['कालोसूची', 'हो'],
    ['कालोसूची कारण', record.blacklistedReason ?? ''],
    ['कालोसूची मिति', formatDate(record.blacklistedAt)],
    ['Tags', record.tags.join(', ')],
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('vehicleBlacklist.detailTitle')}</DialogTitle>
          <DialogDescription>{record.vehicleNumber}</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          {items.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="break-words text-sm font-medium">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
