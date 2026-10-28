'use client';

import { useState } from 'react';
import { FileText, Search, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTqmsVehicleSearch } from '@/features/billing/hooks/useTqmsVehicleSearch';
import type { BillingVehicle } from '@/features/billing/model/types';
import { useTranslations } from '@/utils/translations';

export type VehicleBlacklistCreateInput = {
  vehicle: BillingVehicle;
  blacklistedReason: string;
  tags: string[];
};

type VehicleBlacklistCreateFormProps = {
  isSaving: boolean;
  errorMessage: string | null;
  onSubmit: (input: VehicleBlacklistCreateInput) => Promise<void>;
};

export function VehicleBlacklistCreateForm({
  isSaving,
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
      <CardHeader className="space-y-0 p-4 pb-0">
        <CardTitle className="text-sm">{t('vehicleBlacklist.addFromTqmsTitle')}</CardTitle>
        <CardDescription className="sr-only">{t('vehicleBlacklist.directWorkflowNotice')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
          <div className="relative min-w-0">
            <Label className="sr-only" htmlFor="blacklist-vehicle-search">{t('vehicleBlacklist.tqmsSearchPlaceholder')}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                id="blacklist-vehicle-search"
                className="pl-9"
                placeholder={t('vehicleBlacklist.tqmsSearchPlaceholder')}
                aria-label={t('vehicleBlacklist.tqmsSearchPlaceholder')}
                autoComplete="off"
                value={selectedVehicle ? selectedVehicle.vehicleNumber : vehicleQuery}
                onChange={(event) => {
                  setSelectedVehicle(null);
                  setVehicleQuery(event.target.value);
                  setFormError(null);
                }}
              />
            </div>
            {selectedVehicle ? (
              <div className="mt-1 flex min-w-0 items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                <span className="truncate">{selectedVehicle.vehicleType} · {selectedVehicle.ownerName}</span>
                <Button type="button" variant="link" size="xs" className="shrink-0 px-0" onClick={() => setSelectedVehicle(null)}>
                  {t('vehicleBlacklist.changeVehicleAction')}
                </Button>
              </div>
            ) : null}
            {!selectedVehicle && vehicleQuery.trim().length >= 2 ? (
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-lg" role="listbox" aria-label={t('vehicleBlacklist.tqmsSearchPlaceholder')}>
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

          <div className="relative min-w-0">
            <Label className="sr-only" htmlFor="blacklist-reason">{t('vehicleBlacklist.reasonLabel')}</Label>
            <FileText className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="blacklist-reason"
              className="pl-9"
              value={blacklistedReason}
              maxLength={300}
              onChange={(event) => setBlacklistedReason(event.target.value)}
              placeholder={t('vehicleBlacklist.reasonPlaceholder')}
              aria-label={t('vehicleBlacklist.reasonLabel')}
            />
          </div>

          <Button
            type="button"
            className="sm:min-w-36"
            disabled={!selectedVehicle || isSaving}
            loading={isSaving}
            onClick={() => void handleSubmit()}
          >
            <ShieldAlert className="mr-2 size-4" aria-hidden="true" />
            {t('vehicleBlacklist.addAction')}
          </Button>
        </div>

        <details className="group text-sm">
          <summary className="w-fit cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Tags (optional)
          </summary>
          <div className="mt-2 max-w-md">
            <Label className="sr-only" htmlFor="create-vehicle-tags">Tags (comma separated)</Label>
            <Input id="create-vehicle-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="review, follow-up" />
          </div>
        </details>

        {errorMessage || formError ? (
          <p role="alert" className="border-t pt-2 text-xs text-destructive">{formError ?? errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
