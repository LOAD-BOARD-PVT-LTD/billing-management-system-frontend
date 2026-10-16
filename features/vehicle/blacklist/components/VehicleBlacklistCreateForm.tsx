'use client';

import { useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTqmsVehicleSearch } from '@/features/billing/hooks/useTqmsVehicleSearch';
import type { BillingVehicle } from '@/features/billing/model/types';
import { useTranslations } from '@/utils/translations';
import { toNepaliDigits } from '@/utils/numbers';

export type VehicleBlacklistCreateInput = {
  vehicle: BillingVehicle;
  blacklistedReason: string;
  tags: string[];
};

type VehicleBlacklistCreateFormProps = {
  isSaving: boolean;
  isBlacklistUnavailable: boolean;
  errorMessage: string | null;
  onSubmit: (input: VehicleBlacklistCreateInput) => Promise<void>;
};

export function VehicleBlacklistCreateForm({
  isSaving,
  isBlacklistUnavailable,
  errorMessage,
  onSubmit,
}: VehicleBlacklistCreateFormProps) {
  const { t } = useTranslations();
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<BillingVehicle | null>(null);
  const [blacklistedReason, setBlacklistedReason] = useState('');
  const [tags, setTags] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { vehicles, isLoading: isSearching, error: searchError } = useTqmsVehicleSearch(vehicleQuery);

  const handleSubmit = async () => {
    if (!selectedVehicle?.tqmsVehicleId.trim()) {
      setFormError(t('vehicleBlacklist.selectVehicleRequired'));
      return;
    }
    if (!blacklistedReason.trim()) {
      setFormError('कालोसूचीको कारण आवश्यक छ।');
      return;
    }
    setFormError(null);
    try {
      await onSubmit({
        vehicle: selectedVehicle,
        blacklistedReason: blacklistedReason.trim(),
        tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setSelectedVehicle(null);
      setVehicleQuery('');
      setBlacklistedReason('');
      setTags('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : t('vehicleBlacklist.saveFailed'));
    }
  };

  return (
    <Card id="vehicle-blacklist-create" className="scroll-mt-24">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{t('vehicleBlacklist.addFromTqmsTitle')}</CardTitle>
        <CardDescription>{t('vehicleBlacklist.directWorkflowNotice')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1.8fr] lg:items-start">
          <div className="space-y-2">
            <Label htmlFor="blacklist-vehicle-search">{t('vehicleBlacklist.tqmsSearchPlaceholder')}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="blacklist-vehicle-search"
                className="pl-9"
                placeholder={t('vehicleBlacklist.tqmsSearchPlaceholder')}
                value={selectedVehicle ? selectedVehicle.vehicleNumber : vehicleQuery}
                onChange={(event) => {
                  setSelectedVehicle(null);
                  setVehicleQuery(event.target.value);
                  setFormError(null);
                }}
              />
            </div>
            {selectedVehicle ? (
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <p className="font-medium">{selectedVehicle.vehicleNumber} · {selectedVehicle.vehicleType}</p>
                <p className="text-xs text-muted-foreground">{selectedVehicle.ownerName} · {selectedVehicle.branch || '—'}</p>
                <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setSelectedVehicle(null)}>
                  {t('vehicleBlacklist.changeVehicleAction')}
                </Button>
              </div>
            ) : null}
            {!selectedVehicle && vehicleQuery.trim().length >= 2 ? (
              <div className="max-h-52 overflow-y-auto rounded-md border" role="listbox" aria-label={t('vehicleBlacklist.tqmsSearchPlaceholder')}>
                {searchError ? (
                  <p role="alert" className="p-3 text-sm text-destructive">{searchError}</p>
                ) : isSearching ? (
                  <p className="p-3 text-sm text-muted-foreground">{t('vehicleBlacklist.searching')}</p>
                ) : vehicles.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">{t('vehicleBlacklist.noVehiclesFound')}</p>
                ) : vehicles.map((vehicle) => (
                  <button
                    key={vehicle.tqmsVehicleId || vehicle.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={!vehicle.tqmsVehicleId}
                    className="flex w-full flex-col border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60 disabled:opacity-50"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setFormError(null);
                    }}
                  >
                    <span className="font-medium">{vehicle.vehicleNumber} · {vehicle.vehicleType}</span>
                    <span className="text-xs text-muted-foreground">{vehicle.ownerName} · {vehicle.branch || '—'}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <section className="space-y-3 rounded-md border p-3">
              <Label htmlFor="blacklist-reason">{t('vehicleBlacklist.reasonLabel')}</Label>
              <Textarea id="blacklist-reason" value={blacklistedReason} maxLength={300} onChange={(event) => setBlacklistedReason(event.target.value)} placeholder={t('vehicleBlacklist.reasonPlaceholder')} />
              <p className="text-right text-xs text-muted-foreground">{toNepaliDigits(blacklistedReason.trim().length)}/३००</p>
            </section>
            <div className="space-y-1.5">
              <Label htmlFor="create-vehicle-tags">Tags (comma separated)</Label>
              <Input id="create-vehicle-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="review, follow-up" />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!selectedVehicle || isSaving || isBlacklistUnavailable}
              loading={isSaving}
              onClick={() => void handleSubmit()}
            >
              <ShieldAlert className="mr-2 size-4" aria-hidden="true" />
              {t('vehicleBlacklist.addAction')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">{t('vehicleBlacklist.membershipUnknownNotice')}</p>
          {errorMessage || formError ? <p role="alert" className="text-destructive">{formError ?? errorMessage}</p> : null}
          {isBlacklistUnavailable && !errorMessage ? <p className="text-destructive">{t('vehicleBlacklist.cannotAddWhileUnavailable')}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
