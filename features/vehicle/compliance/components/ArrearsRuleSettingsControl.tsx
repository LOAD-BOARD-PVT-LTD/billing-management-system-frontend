'use client';

import { useState } from 'react';
import { AlertCircle, CalendarDays, ReceiptText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useBillingRuleConfig } from '@/features/billing-rules/hooks/useBillingRuleConfig';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useArrearsRuleSettings } from '@/features/vehicle/compliance/hooks/useArrearsRuleSettings';
import type { ArrearsRuleSettings } from '@/features/vehicle/compliance/api/arrears-settings.api';

type SettingsSection = 'paidExpired' | 'monthlyPaid';

interface ArrearsRuleSettingsControlProps {
  section: SettingsSection;
}

export function ArrearsRuleSettingsControl({ section }: ArrearsRuleSettingsControlProps) {
  const { toast } = useToast();
  const ruleConfig = useBillingRuleConfig();
  const fiscalYearQuery = useFiscalYearManagement();
  const settingQuery = useArrearsRuleSettings();
  const [draft, setDraft] = useState<ArrearsRuleSettings | null>(null);
  const settings = draft ?? settingQuery.settings;
  const isLoading = settingQuery.isLoading || ruleConfig.isLoading || fiscalYearQuery.isLoading;
  const error = settingQuery.error || ruleConfig.error || fiscalYearQuery.error;
  const current = settings?.[section];
  const activeFiscalYears = fiscalYearQuery.fiscalYears.filter((year) => year.status === 'ACTIVE');
  const fiscalYearId = section === 'monthlyPaid' && current && 'fiscalYearId' in current
    ? current.fiscalYearId
    : '';
  const availableRules = ruleConfig.rules.filter((rule) => (
    rule.status === 'ACTIVE'
    && (section === 'paidExpired' || (rule.fiscalYearId === fiscalYearId && rule.frequency === 'PERIODIC' && rule.period === 'MONTH'))
  ));
  const feeHeadNames = new Map(ruleConfig.feeHeads.map((feeHead) => [feeHead.id, feeHead.name]));

  const updateSettings = (update: Partial<ArrearsRuleSettings[SettingsSection]>) => {
    if (!settingQuery.settings) return;
    setDraft({
      ...(draft ?? settingQuery.settings),
      [section]: { ...settingQuery.settings[section], ...draft?.[section], ...update },
    } as ArrearsRuleSettings);
  };

  const save = async () => {
    if (!settings) return;
    try {
      await settingQuery.save(settings);
      setDraft(null);
      toast({ title: 'बक्यौता नियम सुरक्षित भयो।' });
    } catch (cause) {
      toast({
        title: 'बक्यौता नियम सुरक्षित गर्न सकिएन।',
        description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const title = section === 'paidExpired' ? 'तिरेको तर म्याद सकिएको नियम' : 'मासिक तिरेको नियम';
  const description = section === 'paidExpired'
    ? 'छानिएको बिलिङ नियमको भुक्तानी म्याद सकिएका सवारीलाई बक्यौता सूचीमा देखाउनुहोस्।'
    : 'छानिएको आर्थिक वर्ष र मासिक बिलिङ नियमका भुक्तानीलाई सूचीमा देखाउनुहोस्।';
  const Icon = section === 'paidExpired' ? ReceiptText : CalendarDays;
  const ruleId = current?.billingRuleId ?? '';
  const savedCurrent = settingQuery.settings?.[section];
  const isChanged = Boolean(current && savedCurrent && JSON.stringify(current) !== JSON.stringify(savedCurrent));

  return (
    <Card className="space-y-3 rounded-lg border-border/80 p-3 shadow-sm sm:p-4">
      <header className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </header>

      {error ? (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <Button
            type="button"
            size="xs"
            variant="link"
            className="ml-auto h-auto p-0"
            onClick={() => {
              void settingQuery.reload();
              ruleConfig.reload();
              void fiscalYearQuery.reload();
            }}
          >
            पुनः प्रयास
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <p role="status" className="text-xs text-muted-foreground">बिलिङ नियम लोड हुँदैछ...</p>
      ) : settings ? (
        <>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border px-3 py-2.5">
            <Checkbox
              checked={current?.enabled ?? false}
              onCheckedChange={(checked) => updateSettings({ enabled: checked === true })}
              disabled={settingQuery.isSaving}
              className="mt-0.5"
              aria-label={`${title} लागू गर्नुहोस्`}
            />
            <span className="text-sm font-medium">{title} लागू गर्नुहोस्</span>
          </label>

          {section === 'monthlyPaid' ? (
            <div className="space-y-1.5">
              <label htmlFor="arrears-fiscal-year" className="text-xs font-medium">आर्थिक वर्ष</label>
              <Select
                value={fiscalYearId}
                onValueChange={(value) => updateSettings({ fiscalYearId: value, billingRuleId: '' })}
                disabled={settingQuery.isSaving}
              >
                <SelectTrigger id="arrears-fiscal-year" aria-label="मासिक भुक्तानीको आर्थिक वर्ष">
                  <SelectValue placeholder="आर्थिक वर्ष छान्नुहोस्" />
                </SelectTrigger>
                <SelectContent>
                  {activeFiscalYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor={`arrears-rule-${section}`} className="text-xs font-medium">बिलिङ नियम</label>
            <Select
              value={ruleId}
              onValueChange={(value) => updateSettings({ billingRuleId: value })}
              disabled={settingQuery.isSaving || (section === 'monthlyPaid' && !fiscalYearId)}
            >
              <SelectTrigger id={`arrears-rule-${section}`} aria-label={`${title} का लागि बिलिङ नियम`}>
                <SelectValue placeholder="बिलिङ नियम छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                {availableRules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {feeHeadNames.get(rule.feeHeadId) ?? rule.feeHeadId} · {rule.amount.toLocaleString('en-US')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableRules.length === 0 ? (
              <p className="text-xs text-muted-foreground">छानिएको अवस्थाका लागि सक्रिय बिलिङ नियम उपलब्ध छैन।</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => void save()}
              loading={settingQuery.isSaving}
              disabled={!isChanged || settingQuery.isSaving}
            >
              सुरक्षित गर्नुहोस्
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}
