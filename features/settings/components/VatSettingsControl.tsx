'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, BadgeCheck, ReceiptText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { useVatSettings } from '@/features/settings/hooks/useVatSettings';
import type { VatSettings } from '@/features/settings/api/vat-settings.api';

export function VatSettingsControl() {
  const { toast } = useToast();
  const vatQuery = useVatSettings();
  const entitiesQuery = useBillingEntities();
  const [draft, setDraft] = useState<VatSettings | null>(null);
  const settings = draft ?? vatQuery.settings;
  const activeEntities = useMemo(
    () => entitiesQuery.records.filter((entity) => entity.status === 'ACTIVE'),
    [entitiesQuery.records],
  );
  const isLoading = vatQuery.isLoading || entitiesQuery.isLoading;
  const error = vatQuery.error || entitiesQuery.error;
  const isChanged = Boolean(settings && vatQuery.settings
    && JSON.stringify(settings) !== JSON.stringify(vatQuery.settings));

  const updateSettings = (update: Partial<VatSettings>) => {
    if (!vatQuery.settings) return;
    setDraft({ ...(draft ?? vatQuery.settings), ...update });
  };

  const toggleEntity = (entityId: string, enabled: boolean) => {
    const currentIds = settings?.billingEntityIds ?? [];
    updateSettings({
      billingEntityIds: enabled
        ? [...new Set([...currentIds, entityId])]
        : currentIds.filter((id) => id !== entityId),
    });
  };

  const save = async () => {
    if (!settings) return;
    try {
      await vatQuery.save(settings);
      setDraft(null);
      toast({ title: 'VAT सेटिङ सुरक्षित भयो।' });
    } catch (cause) {
      toast({
        title: 'VAT सेटिङ सुरक्षित गर्न सकिएन।',
        description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="space-y-4 rounded-lg border-border/80 p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ReceiptText className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">VAT सेटिङ</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            VAT दर र कुन Billing Entity मा लागू हुने हो, यहीँबाट व्यवस्थापन गर्नुहोस्।
          </p>
        </div>
        {settings ? (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${settings.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
            <BadgeCheck aria-hidden="true" className="size-3" />
            {settings.enabled ? 'सक्रिय' : 'बन्द'}
          </span>
        ) : null}
      </header>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button
            type="button"
            size="xs"
            variant="link"
            className="h-auto shrink-0 p-0"
            onClick={() => {
              void vatQuery.reload();
              void entitiesQuery.reload();
            }}
          >
            पुनः प्रयास
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p role="status" className="py-3 text-center text-xs text-muted-foreground">VAT र संस्था विवरण लोड हुँदैछ...</p>
      ) : settings ? (
        <>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/30">
            <Checkbox
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSettings({ enabled: checked === true })}
              disabled={vatQuery.isSaving}
              className="mt-0.5"
              aria-label="मुख्य संस्थामा VAT लागू गर्नुहोस्"
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium">मुख्य संस्थामा VAT लागू गर्नुहोस्</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                मुख्य संस्थाको VAT चालु वा बन्द गर्नुहोस्।
              </span>
            </span>
          </label>

          <div className="max-w-xs space-y-1.5">
            <label htmlFor="organization-vat-rate" className="text-xs font-medium">VAT दर (%)</label>
            <div className="relative">
              <Input
                id="organization-vat-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={settings.rate}
                onChange={(event) => {
                  const rate = event.target.value === '' ? 0 : Number(event.target.value);
                  updateSettings({ rate });
                }}
                aria-describedby="organization-vat-rate-help"
                className="h-9 pr-8 text-sm tabular-nums"
                disabled={vatQuery.isSaving}
              />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">%</span>
            </div>
            <p id="organization-vat-rate-help" className="text-[11px] text-muted-foreground">० देखि १०० बीचको दर राख्नुहोस्।</p>
          </div>

          <section aria-labelledby="vat-entities-heading" className="space-y-2 border-t border-border/70 pt-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <h4 id="vat-entities-heading" className="text-xs font-semibold">VAT लाग्ने Billing Entity</h4>
                <p className="mt-0.5 text-[11px] text-muted-foreground">प्रत्येक सक्रिय संस्थाका लागि VAT अलग-अलग छान्नुहोस्।</p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {activeEntities.length} सक्रिय
              </span>
            </div>

            {activeEntities.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeEntities.map((entity) => {
                  const checked = settings.billingEntityIds.includes(entity.id);
                  return (
                    <label
                      key={entity.id}
                      className="flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-md border border-border/80 px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium" title={entity.entity}>{entity.entity}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">सक्रिय संस्था</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className={`text-[10px] ${checked ? 'text-emerald-700' : 'text-muted-foreground'}`}>
                          {checked ? 'VAT लागू' : 'लागू छैन'}
                        </span>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleEntity(entity.id, value === true)}
                          disabled={vatQuery.isSaving}
                          aria-label={`${entity.entity} मा VAT लागू गर्नुहोस्`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                सक्रिय Billing Entity भेटिएन।
              </p>
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-muted-foreground">
              परिवर्तन सुरक्षित गरेपछि मात्र लागू हुन्छ।
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              loading={vatQuery.isSaving}
              disabled={!isChanged || vatQuery.isSaving}
            >
              VAT सेटिङ सुरक्षित गर्नुहोस्
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
