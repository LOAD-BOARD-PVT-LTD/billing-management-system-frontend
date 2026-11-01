'use client';

import { useState } from 'react';
import { AlertCircle, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { useDisplacedTaggingSetting } from '@/features/settings/hooks/useDisplacedTaggingSetting';
import { useTranslations } from '@/utils/translations';

export function DisplacedTaggingControl() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { setting, enabled, isLoading, isSaving, error, reload, save } = useDisplacedTaggingSetting();
  const [draftEnabled, setDraftEnabled] = useState<boolean | null>(null);
  const value = draftEnabled ?? enabled;

  const submit = async () => {
    try {
      await save(value);
      setDraftEnabled(null);
      toast({ title: t('settings.displacedTaggingSaved') });
    } catch (cause) {
      toast({
        title: t('settings.displacedTaggingSaveFailed'),
        description: cause instanceof Error ? cause.message : t('settings.displacedTaggingSaveFailed'),
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border/80 bg-card p-3 shadow-sm">
      <header className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{t('settings.displacedTaggingTitle')}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t('settings.displacedTaggingDescription')}</p>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('settings.displacedTaggingLoadFailed')}</span>
          <Button type="button" size="xs" variant="link" className="ml-auto h-auto p-0" onClick={() => void reload()}>
            {t('settings.displacedTaggingRetry')}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p role="status" className="text-xs text-muted-foreground">{t('settings.displacedTaggingLoading')}</p>
      ) : setting ? (
        <>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
            <Checkbox
              checked={value}
              onCheckedChange={(checked) => setDraftEnabled(checked === true)}
              disabled={isSaving}
              aria-label={t('settings.displacedTaggingLabel')}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t('settings.displacedTaggingLabel')}</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{t('settings.displacedTaggingHint')}</span>
            </span>
          </label>
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void submit()} loading={isSaving} disabled={value === enabled || isSaving}>
              {t('settings.displacedTaggingSave')}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
