'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { useTranslations } from '@/utils/translations';

type VehicleBlacklistRemoveDialogProps = {
  record: VehicleBlacklistRecord;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (record: VehicleBlacklistRecord) => Promise<void>;
};

export function VehicleBlacklistRemoveDialog({ record, isSaving, onClose, onConfirm }: VehicleBlacklistRemoveDialogProps) {
  const { t } = useTranslations();
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await onConfirm(record);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('vehicleBlacklist.saveFailed'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('vehicleBlacklist.removeConfirmTitle')}</DialogTitle>
          <DialogDescription>{`${t('vehicleBlacklist.removeConfirmBody')} ${record.vehicleNumber}`}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">यसले VehicleResource को metadata मा isBlacklisted false गर्नेछ।</p>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>{t('actions.cancel')}</Button>
          <Button type="button" variant="destructive" disabled={isSaving} loading={isSaving} onClick={() => void submit()}>{t('vehicleBlacklist.removeAction')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
