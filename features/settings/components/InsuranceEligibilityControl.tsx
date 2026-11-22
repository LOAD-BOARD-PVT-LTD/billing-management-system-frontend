'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useBillingRuleConfig } from '@/features/billing-rules/hooks/useBillingRuleConfig';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import {
  buildInsuranceEligibilityRuleOptions,
  summarizeInsuranceEligibilitySelection,
  type InsuranceEligibilitySettings,
} from '@/features/settings/api/insurance-eligibility.api';
import { useInsuranceEligibility } from '@/features/settings/hooks/useInsuranceEligibility';

export function InsuranceEligibilityControl() {
  const { toast } = useToast();
  const eligibilityQuery = useInsuranceEligibility();
  const billingRuleConfig = useBillingRuleConfig();
  const vehicleTypesQuery = useVehicleTypes();

  const [draft, setDraft] = useState<InsuranceEligibilitySettings | null>(null);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [ruleSearch, setRuleSearch] = useState('');
  const [fiscalYearFilter, setFiscalYearFilter] = useState('all');

  const settings = draft ?? eligibilityQuery.settings;

  const ruleOptions = useMemo(
    () => buildInsuranceEligibilityRuleOptions({
      rules: billingRuleConfig.config.rules,
      feeHeads: billingRuleConfig.config.feeHeads,
      fiscalYears: billingRuleConfig.config.fiscalYears,
      vehicleCategories: vehicleTypesQuery.records,
    }),
    [
      billingRuleConfig.config.rules,
      billingRuleConfig.config.feeHeads,
      billingRuleConfig.config.fiscalYears,
      vehicleTypesQuery.records,
    ],
  );

  const summary = useMemo(
    () => summarizeInsuranceEligibilitySelection(ruleOptions, settings?.ruleIds ?? []),
    [ruleOptions, settings?.ruleIds],
  );

  const filteredDialogOptions = useMemo(() => {
    const query = ruleSearch.trim().toLocaleLowerCase();
    return ruleOptions.filter((option) => {
      if (fiscalYearFilter !== 'all' && option.rule.fiscalYearId !== fiscalYearFilter) {
        return false;
      }
      if (!query) return true;
      return `${option.label} ${option.fiscalYearName} ${option.rule.scope === 'COMMON' ? 'common' : 'vehicle type'}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [fiscalYearFilter, ruleOptions, ruleSearch]);

  const dialogCommonOptions = useMemo(
    () => filteredDialogOptions.filter((option) => option.rule.scope === 'COMMON'),
    [filteredDialogOptions],
  );
  const dialogVehicleOptions = useMemo(
    () => filteredDialogOptions.filter((option) => option.rule.scope === 'VEHICLE_TYPE'),
    [filteredDialogOptions],
  );

  const isLoading = eligibilityQuery.isLoading || billingRuleConfig.isLoading || vehicleTypesQuery.isLoading;
  const error = eligibilityQuery.error || billingRuleConfig.error || vehicleTypesQuery.error;
  const isChanged = Boolean(
    settings
    && eligibilityQuery.settings
    && JSON.stringify(settings) !== JSON.stringify(eligibilityQuery.settings),
  );

  const updateSettings = (update: Partial<InsuranceEligibilitySettings>) => {
    if (!eligibilityQuery.settings) return;
    setDraft({ ...(draft ?? eligibilityQuery.settings), ...update });
  };

  const toggleRule = (ruleId: string, checked: boolean) => {
    const currentIds = settings?.ruleIds ?? [];
    const nextIds = checked
      ? [...new Set([...currentIds, ruleId])]
      : currentIds.filter((id) => id !== ruleId);
    const nextMinPaid = nextIds.length > 0 && (settings?.minPaidRules ?? 1) > nextIds.length
      ? nextIds.length
      : (settings?.minPaidRules ?? 1);
    updateSettings({
      ruleIds: nextIds,
      minPaidRules: nextMinPaid,
    });
  };

  const save = async () => {
    if (!settings) return;
    try {
      await eligibilityQuery.save(settings);
      setDraft(null);
      toast({ title: 'Insurance eligibility सेटिङ सुरक्षित भयो।' });
    } catch (cause) {
      toast({
        title: 'Insurance eligibility सेटिङ सुरक्षित गर्न सकिएन।',
        description: cause instanceof Error ? cause.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const selectedSet = useMemo(() => new Set(settings?.ruleIds ?? []), [settings?.ruleIds]);

  return (
    <>
      <Card className="space-y-4 rounded-lg border-border/80 p-4 shadow-sm sm:p-5">
        <header>
          <h3 className="text-base font-semibold text-foreground">Insurance eligibility rules</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            यहाँ छानिएका active billing rules पूरा भए मात्र CTS मा vehicle eligible मानिन्छ।
          </p>
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
                void eligibilityQuery.reload();
                void billingRuleConfig.reload();
                void vehicleTypesQuery.reload();
              }}
            >
              पुनः प्रयास
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <p role="status" className="py-3 text-center text-xs text-muted-foreground">
            Insurance eligibility सेटिङ लोड हुँदैछ...
          </p>
        ) : settings ? (
          <>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3.5 py-3 transition-colors hover:bg-muted/30">
              <span className="text-sm font-medium text-foreground">
                Insurance eligibility policy enable गर्नुहोस्
              </span>
              <Checkbox
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSettings({ enabled: checked === true })}
                disabled={eligibilityQuery.isSaving}
                aria-label="Insurance eligibility policy enable गर्नुहोस्"
              />
            </label>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Eligibility का लागि गणना हुने billing rules
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {summary.totalVisibleCount} visible rule मध्ये {summary.selectedCount} छानिएको छ।
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRulesDialogOpen(true)}
                  disabled={eligibilityQuery.isSaving}
                >
                  Rules व्यवस्थापन गर्नुहोस्
                </Button>
              </div>

              <div className="space-y-3 rounded-md border border-border p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {summary.totalVisibleCount} visible rule मध्ये {summary.selectedCount} छानिएको छ।
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                    Common Rule: {summary.commonRules.length}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                    Vehicle Type Rule: {summary.vehicleTypeRules.length}
                  </span>
                </div>

                <div className="grid gap-4 border-t border-border/60 pt-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        COMMON RULE
                      </span>
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                        {summary.commonRules.length}
                      </span>
                    </div>
                    {summary.commonRules.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {summary.commonRules.map((option) => (
                          <span
                            key={option.rule.id}
                            className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            {option.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">कुनै Common Rule छानिएको छैन।</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        VEHICLE TYPE RULE
                      </span>
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-border px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                        {summary.vehicleTypeRules.length}
                      </span>
                    </div>
                    {summary.vehicleTypeRules.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {summary.vehicleTypeRules.map((option) => (
                          <span
                            key={option.rule.id}
                            className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            {option.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">कुनै Vehicle Type Rule छानिएको छैन।</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="insurance-eligibility-min-paid" className="text-sm font-medium text-foreground">
                कम्तीमा कति rule paid हुनुपर्छ
              </label>
              <Input
                id="insurance-eligibility-min-paid"
                type="number"
                min={1}
                max={Math.max(1, summary.selectedCount)}
                step={1}
                value={settings.minPaidRules}
                onChange={(event) => {
                  const raw = event.target.value;
                  const parsed = raw === '' ? 1 : Math.trunc(Number(raw));
                  updateSettings({ minPaidRules: Number.isFinite(parsed) && parsed >= 1 ? parsed : 1 });
                }}
                disabled={eligibilityQuery.isSaving}
                aria-describedby="insurance-eligibility-min-paid-help"
                className="h-9 text-sm tabular-nums"
              />
              <p id="insurance-eligibility-min-paid-help" className="text-xs text-muted-foreground">
                {summary.selectedCount} वटा rule select गरिएको छ। eligibility का लागि कति वटा paid हुनुपर्छ भन्ने संख्या राख्नुहोस्।
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => void save()}
                loading={eligibilityQuery.isSaving}
                disabled={!isChanged || eligibilityQuery.isSaving}
              >
                Eligibility settings सुरक्षित गर्नुहोस्
              </Button>
            </div>
          </>
        ) : null}
      </Card>

      <Dialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Eligibility का लागि गणना हुने billing rules</DialogTitle>
            <DialogDescription>
              CTS बीमा योग्यताका लागि आवश्यक active billing rules छान्नुहोस्।
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={ruleSearch}
                onChange={(event) => setRuleSearch(event.target.value)}
                placeholder="शुल्क शीर्षक वा सवारी प्रकार खोज्नुहोस्..."
                aria-label="Billing rules खोज्नुहोस्"
                className="h-9 pl-8 text-sm"
              />
            </div>
            <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44" aria-label="आर्थिक वर्ष फिल्टर">
                <SelectValue placeholder="सबै आर्थिक वर्ष" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">सबै आर्थिक वर्ष</SelectItem>
                {billingRuleConfig.config.fiscalYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{filteredDialogOptions.length} नियम देखाइएको · {summary.selectedCount} छानिएको</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  const nextIds = [...new Set([...(settings?.ruleIds ?? []), ...filteredDialogOptions.map((o) => o.rule.id)])];
                  updateSettings({ ruleIds: nextIds });
                }}
                disabled={filteredDialogOptions.length === 0}
              >
                देखिएका सबै छान्नुहोस्
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => updateSettings({ ruleIds: [], minPaidRules: 1 })}
                disabled={summary.selectedCount === 0}
              >
                सबै हटाउनुहोस्
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {filteredDialogOptions.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                कुनै सक्रिय billing rule भेटिएन।
              </p>
            ) : (
              <>
                {dialogCommonOptions.length > 0 ? (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Common Rules ({dialogCommonOptions.length})
                    </h5>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {dialogCommonOptions.map((option) => (
                        <label
                          key={option.rule.id}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2 text-xs hover:bg-muted/30"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{option.label}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {option.fiscalYearName} · रु. {option.rule.amount.toLocaleString('en-IN')}
                            </span>
                          </span>
                          <Checkbox
                            checked={selectedSet.has(option.rule.id)}
                            onCheckedChange={(checked) => toggleRule(option.rule.id, checked === true)}
                            aria-label={`${option.label} छान्नुहोस्`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                {dialogVehicleOptions.length > 0 ? (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Vehicle Type Rules ({dialogVehicleOptions.length})
                    </h5>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {dialogVehicleOptions.map((option) => (
                        <label
                          key={option.rule.id}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2 text-xs hover:bg-muted/30"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{option.label}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {option.fiscalYearName} · रु. {option.rule.amount.toLocaleString('en-IN')}
                            </span>
                          </span>
                          <Checkbox
                            checked={selectedSet.has(option.rule.id)}
                            onCheckedChange={(checked) => toggleRule(option.rule.id, checked === true)}
                            aria-label={`${option.label} छान्नुहोस्`}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" size="sm" onClick={() => setRulesDialogOpen(false)}>
              बन्द गर्नुहोस्
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
