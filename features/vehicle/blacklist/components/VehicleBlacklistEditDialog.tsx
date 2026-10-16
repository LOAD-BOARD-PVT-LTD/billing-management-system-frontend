'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VehicleBlacklistRecord, VehicleStatusMetadata } from '@/features/vehicle/blacklist';
import { useTranslations } from '@/utils/translations';

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function toUtcDate(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

type VehicleBlacklistEditDialogProps = {
  record: VehicleBlacklistRecord;
  isSaving: boolean;
  onClose: () => void;
  onSave: (record: VehicleBlacklistRecord, metadata: VehicleStatusMetadata) => Promise<void>;
};

export function VehicleBlacklistEditDialog({ record, isSaving, onClose, onSave }: VehicleBlacklistEditDialogProps) {
  const { t } = useTranslations();
  const [isBlacklisted, setIsBlacklisted] = useState(record.isBlacklisted);
  const [blacklistedReason, setBlacklistedReason] = useState(record.blacklistedReason ?? '');
  const [blacklistedAt, setBlacklistedAt] = useState(toDateInput(record.blacklistedAt));
  const [tags, setTags] = useState(record.tags.join(', '));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (isBlacklisted && !blacklistedReason.trim()) {
      setError('कालोसूचीको कारण आवश्यक छ।');
      return;
    }
    setError(null);
    const metadata: VehicleStatusMetadata = {
      isBlacklisted,
      blacklistedReason: isBlacklisted ? blacklistedReason.trim() : null,
      blacklistedAt: isBlacklisted
        ? toUtcDate(blacklistedAt) ?? (record.blacklistedAt || new Date().toISOString())
        : null,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      await onSave(record, metadata);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('vehicleBlacklist.saveFailed'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>कालोसूची विवरण सम्पादन</DialogTitle>
          <DialogDescription>{record.vehicleNumber} · {record.vehicleType}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <section className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Checkbox id="vehicle-is-blacklisted" checked={isBlacklisted} onCheckedChange={(checked) => setIsBlacklisted(checked === true)} />
              <Label htmlFor="vehicle-is-blacklisted">कालोसूचीमा राखिएको</Label>
            </div>
            {isBlacklisted ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="vehicle-blacklisted-reason">कालोसूचीको कारण</Label>
                  <Textarea id="vehicle-blacklisted-reason" value={blacklistedReason} maxLength={300} onChange={(event) => setBlacklistedReason(event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vehicle-blacklisted-date">कालोसूची मिति</Label>
                  <Input id="vehicle-blacklisted-date" type="date" value={blacklistedAt.slice(0, 10)} onChange={(event) => setBlacklistedAt(event.target.value)} />
                </div>
              </div>
            ) : null}
          </section>

          <div className="space-y-1.5">
            <Label htmlFor="vehicle-status-tags">Tags (comma separated)</Label>
            <Input id="vehicle-status-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="blacklisted, review" />
            <p className="text-xs text-muted-foreground">blacklisted tag कालोसूची स्थिति अनुसार स्वतः अद्यावधिक हुन्छ।</p>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>{t('actions.cancel')}</Button>
          <Button type="button" disabled={isSaving} loading={isSaving} onClick={() => void submit()}>{t('actions.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
