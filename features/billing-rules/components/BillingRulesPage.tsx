'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Plus, RotateCcw } from 'lucide-react';

import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { DataTableToolbar } from '@/components/data-tables/DataTableToolbar';
import { ErrorState } from '@/components/feedback/ErrorState';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useBillingEntities } from '@/features/administration/billing-entities/hooks/useBillingEntities';
import { BillingRuleDetailsDialog } from '@/features/billing-rules/components/BillingRuleDetailsDialog';
import { BillingRuleForm } from '@/features/billing-rules/components/BillingRuleForm';
import type { VehicleRuleSubmission } from '@/features/billing-rules/components/VehicleTypeRuleMatrix';
import { BillingRulesTable } from '@/features/billing-rules/components/BillingRulesTable';
import { FeeHeadManager } from '@/features/billing-rules/components/configuration/FeeHeadManager';
import { useBillingRuleConfig } from '@/features/billing-rules/hooks/useBillingRuleConfig';
import type { BillingRule, FeeHead, Frequency, RuleStatus, Scope } from '@/features/billing-rules/model/types';
import { DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS } from '@/features/settings/api/fiscal-year-selector.api';
import { useFiscalYearSelectorSettings } from '@/features/settings/hooks/useFiscalYearSelectorSettings';
import { findDuplicateRule } from '@/features/billing-rules/schemas/billingRuleSchema';
import { filterBillingRules, groupVehicleTypeRules, sortBillingRules, type BillingRuleSortColumn } from '@/features/billing-rules/utils/rule-grouping';
import { formatFiscalYearForDisplay, formatNepaliFiscalYearLabel, generateNepaliFiscalYearOptions, parseFiscalYear } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { useTranslations } from '@/utils/translations';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 10;

type BillingRulesPageProps = {
  editRuleId?: string;
};

export function BillingRulesPage({ editRuleId }: BillingRulesPageProps) {
  const router = useRouter();
  const {
    config,
    isLoading,
    hasLoaded,
    isSaving,
    error,
    reload,
    save,
    addFeeHead,
    updateFeeHead,
  } = useBillingRuleConfig();
  const { settings: fiscalYearSelectorSettings } = useFiscalYearSelectorSettings();
  const { t } = useTranslations();
  const {
    records: billingEntities,
    isLoading: isLoadingBillingEntities,
    error: billingEntitiesError,
    reload: reloadBillingEntities,
  } = useBillingEntities();
  const { records: vehicleCategories, error: vehicleError } = useVehicleTypes();
  const { toast } = useToast();

  const [scope, setScope] = useState<Scope>('VEHICLE_TYPE');
  const [fiscalYearChoice, setFiscalYearChoice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feeHeadFilter, setFeeHeadFilter] = useState('all');
  const [vehicleCategoryFilter, setVehicleCategoryFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState<Frequency | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RuleStatus | 'all'>('all');
  const [sortColumn, setSortColumn] = useState<BillingRuleSortColumn>('feeHead');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');
  const [page, setPage] = useState(1);
  const [ruleEditorOpen, setRuleEditorOpen] = useState(false);
  const [viewingRule, setViewingRule] = useState<BillingRule | null>(null);
  const [statusRule, setStatusRule] = useState<BillingRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<BillingRule | null>(null);

  const editingRule = editRuleId
    ? config.rules.find((rule) => rule.id === editRuleId) ?? null
    : null;
  const isRuleEditorOpen = Boolean(editRuleId) || ruleEditorOpen;

  const selectorSettings = fiscalYearSelectorSettings ?? DEFAULT_FISCAL_YEAR_SELECTOR_SETTINGS;
  const availableFiscalYears = useMemo(() => {
    const visibleFiscalYearLabels = new Set(generateNepaliFiscalYearOptions({
      yearsBack: selectorSettings.yearsBack,
      yearsForward: selectorSettings.yearsForward,
      archivedYears: selectorSettings.archivedYears,
    }));
    return config.fiscalYears.filter((year) => {
      const fiscalYear = year.code ?? year.name;
      const parsedYear = parseFiscalYear(fiscalYear);
      if (parsedYear === null) return true;
      const label = formatNepaliFiscalYearLabel(parsedYear);
      return year.status === 'ACTIVE' || visibleFiscalYearLabels.has(label);
    });
  }, [config.fiscalYears, selectorSettings.archivedYears, selectorSettings.yearsBack, selectorSettings.yearsForward]);
  const defaultFiscalYear = availableFiscalYears.find((year) => year.status === 'ACTIVE' && year.isDefault)
    ?? availableFiscalYears.find((year) => year.status === 'ACTIVE');
  const fiscalYearFilter = fiscalYearChoice === 'all' || availableFiscalYears.some((year) => year.id === fiscalYearChoice)
    ? fiscalYearChoice ?? 'all'
    : defaultFiscalYear?.id ?? 'all';
  const vehicleCategoryIds = vehicleCategories.map((category) => category.id);
  const activeVehicleCategoryFilter = vehicleCategoryIds.includes(vehicleCategoryFilter) ? vehicleCategoryFilter : 'all';
  const hasSearch = search.trim().length > 0;
  const contextRules = config.rules.filter((rule) => fiscalYearFilter === 'all' || rule.fiscalYearId === fiscalYearFilter);
  const contextVehicleGroups = groupVehicleTypeRules(contextRules.filter((rule) =>
    rule.scope === 'VEHICLE_TYPE' && rule.status === 'ACTIVE',
  ));
  const contextCommonRules = contextRules.filter((rule) => rule.scope === 'COMMON');
  const vehicleTypeFeeHeadIds = Array.from(new Set(
    config.rules
      .filter((rule) => rule.scope === 'VEHICLE_TYPE'
        && rule.status === 'ACTIVE'
        && (fiscalYearFilter === 'all' || rule.fiscalYearId === fiscalYearFilter))
      .map((rule) => rule.feeHeadId),
  ));
  const totalRules = contextVehicleGroups.length + contextCommonRules.length;
  const vehicleTypeRules = contextVehicleGroups.length;
  const commonRules = contextCommonRules.length;
  const activeRules = contextVehicleGroups.filter((group) => group.every((rule) => rule.status === 'ACTIVE')).length
    + contextCommonRules.filter((rule) => rule.status === 'ACTIVE').length;

  const activeFeeHeadIds = new Set(config.feeHeads.filter((feeHead) => feeHead.status === 'ACTIVE').map((feeHead) => feeHead.id));
  const rulesForDisplay = config.rules.filter((rule) =>
    activeFeeHeadIds.has(rule.feeHeadId)
    && (scope !== 'VEHICLE_TYPE' || rule.status === 'ACTIVE'),
  );
  const filteredRules = useMemo(() => filterBillingRules(rulesForDisplay, config, {
    scope,
    fiscalYearId: fiscalYearFilter,
    feeHeadId: scope === 'VEHICLE_TYPE' ? 'all' : feeHeadFilter,
    vehicleCategoryId: scope === 'VEHICLE_TYPE' ? activeVehicleCategoryFilter : 'all',
    billingEntityId: entityFilter,
    frequency: frequencyFilter,
    status: statusFilter,
    search,
  }, vehicleCategories, billingEntities), [
    rulesForDisplay,
    config,
    scope,
    fiscalYearFilter,
    feeHeadFilter,
    activeVehicleCategoryFilter,
    entityFilter,
    frequencyFilter,
    statusFilter,
    search,
    vehicleCategories,
    billingEntities,
  ]);

  const sortedRules = useMemo(() => sortBillingRules(filteredRules, config, {
    column: sortColumn,
    direction: sortDirection,
  }, vehicleCategories), [filteredRules, config, sortColumn, sortDirection, vehicleCategories]);

  const vehicleRuleGroups = useMemo(() => groupVehicleTypeRules(sortedRules), [sortedRules]);
  const pageCount = Math.max(1, Math.ceil((scope === 'VEHICLE_TYPE' ? vehicleRuleGroups.length : sortedRules.length) / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRules = scope === 'VEHICLE_TYPE'
    ? vehicleRuleGroups.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).flat()
    : sortedRules.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageTotal = scope === 'VEHICLE_TYPE' ? vehicleRuleGroups.length : sortedRules.length;
  const resetFilters = () => {
    setSearch('');
    setFeeHeadFilter('all');
    setVehicleCategoryFilter('all');
    setEntityFilter('all');
    setFrequencyFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const openCreateDialog = () => {
    setRuleEditorOpen(true);
  };

  const openEditDialog = (rule: BillingRule) => {
    router.push(`/dashboard/billing-rules/${encodeURIComponent(rule.id)}/edit`);
  };

  const handleSaveRule = async (rule: BillingRule, feeHead: FeeHead) => {
    const billingEntity = billingEntities.find((entity) => entity.id === rule.billingEntityId);
    const existingRule = config.rules.find((item) =>
      item.id === rule.id && item.billingEntityId === rule.billingEntityId,
    );
    if (!billingEntity && !existingRule) {
      toast({
        title: 'Billing Entity चयन आवश्यक छ',
        description: billingEntitiesError ?? 'नियम सुरक्षित गर्न सक्रिय Billing Entity पुनः चयन गर्नुहोस्।',
        variant: 'destructive',
      });
      return;
    }

    const ruleWithEntity: BillingRule = {
      ...rule,
      billingEntityId: billingEntity?.id ?? existingRule?.billingEntityId ?? null,
    };
    const nextConfig = {
      ...config,
      feeHeads: [...config.feeHeads.filter((item) => item.id !== feeHead.id), feeHead],
      rules: [...config.rules.filter((item) => item.id !== ruleWithEntity.id), ruleWithEntity],
    };
    try {
      await save(nextConfig);
      toast({
        title: editingRule ? 'बिलिङ नियम परिवर्तन सुरक्षित भयो' : 'बिलिङ नियम सिर्जना भयो',
        description: `${feeHead.name} सफलतापूर्वक सुरक्षित भयो।`,
      });
      closeRuleEditor();
    } catch (saveError) {
      toast({
        title: 'बिलिङ नियम सुरक्षित हुन सकेन',
        description: saveError instanceof Error ? saveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCommonRules = async (items: Array<{ rule: BillingRule; feeHead: FeeHead }>) => {
    const rules = [...config.rules];
    for (const { rule } of items) {
      if (!billingEntities.some((entity) => entity.id === rule.billingEntityId)) {
        toast({
          title: 'Billing Entity चयन आवश्यक छ',
          description: billingEntitiesError ?? 'हरेक Common Rule का लागि Billing Entity छान्नुहोस्।',
          variant: 'destructive',
        });
        return;
      }
      if (findDuplicateRule(rules, rule)) {
        const feeHeadName = config.feeHeads.find((feeHead) => feeHead.id === rule.feeHeadId)?.name ?? rule.feeHeadId;
        toast({
          title: 'यस्तै Common Rule पहिले नै छ',
          description: `${feeHeadName} का लागि दोहोरिएको सक्रिय नियम सुरक्षित गर्न सकिँदैन।`,
          variant: 'destructive',
        });
        return;
      }
      rules.push(rule);
    }

    try {
      await save({ ...config, rules });
      toast({
        title: 'Common Rules सिर्जना भए',
        description: `${items.length} वटा नियम सफलतापूर्वक सुरक्षित भए।`,
      });
      closeRuleEditor();
    } catch (saveError) {
      toast({
        title: 'Common Rules सुरक्षित हुन सकेनन्',
        description: saveError instanceof Error ? saveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleSaveVehicleRules = async ({
    fiscalYearId,
    editingVehicleCategoryId,
    entries,
  }: VehicleRuleSubmission) => {
    const invalidEntry = entries.find((entry) =>
      !billingEntities.some((entity) => entity.id === entry.rule.billingEntityId),
    );
    if (invalidEntry) {
      toast({
        title: 'Billing Entity चयन आवश्यक छ',
        description: billingEntitiesError ?? `${invalidEntry.feeHead.name} शुल्क शीर्षकका लागि उपलब्ध Billing Entity छान्नुहोस्।`,
        variant: 'destructive',
      });
      return;
    }

    const feeHeadsById = new Map(config.feeHeads.map((feeHead) => [feeHead.id, feeHead]));
    for (const { feeHead } of entries) feeHeadsById.set(feeHead.id, feeHead);
    const rulesById = new Map(config.rules.map((rule) => [rule.id, rule]));
    for (const { rule } of entries) rulesById.set(rule.id, rule);
    const submittedRuleIds = new Set(entries.map(({ rule }) => rule.id));
    for (const rule of config.rules) {
      if (rule.scope === 'VEHICLE_TYPE'
        && rule.fiscalYearId === fiscalYearId
        && editingVehicleCategoryId
        && rule.vehicleCategoryId === editingVehicleCategoryId
        && !submittedRuleIds.has(rule.id)) {
        rulesById.delete(rule.id);
      }
    }

    try {
      await save({
        ...config,
        feeHeads: Array.from(feeHeadsById.values()),
        rules: Array.from(rulesById.values()),
      });
      toast({
        title: editingRule ? 'बिलिङ नियम परिवर्तन सुरक्षित भयो' : 'बिलिङ नियम सिर्जना भयो',
        description: entries.length > 0
          ? `${entries.length} सवारी शुल्क नियम सुरक्षित भयो।`
          : 'खाली रकम भएका सवारी शुल्क नियम हटाइयो।',
      });
      closeRuleEditor();
    } catch (saveError) {
      toast({
        title: 'बिलिङ नियम सुरक्षित हुन सकेन',
        description: saveError instanceof Error ? saveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const handleBillingEntityChange = async (rule: BillingRule, billingEntityId: string) => {
    const billingEntity = billingEntities.find((entity) => entity.id === billingEntityId);
    if (!billingEntity) {
      toast({
        title: 'Billing Entity भेटिएन',
        description: 'कृपया सूचीबाट उपलब्ध संस्था चयन गर्नुहोस्।',
        variant: 'destructive',
      });
      return;
    }

    const updatedRule = { ...rule, billingEntityId: billingEntity.id };
    const nextConfig = {
      ...config,
      rules: config.rules.map((item) => item.id === rule.id ? updatedRule : item),
    };

    try {
      await save(nextConfig);
      toast({
        title: 'Billing Entity अद्यावधिक भयो',
        description: `${billingEntity.entity} नियममा सुरक्षित भयो।`,
      });
    } catch (saveError) {
      toast({
        title: 'Billing Entity अद्यावधिक हुन सकेन',
        description: saveError instanceof Error ? saveError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const closeRuleEditor = () => {
    if (editRuleId) {
      router.replace('/dashboard/billing-rules');
      return;
    }
    setRuleEditorOpen(false);
  };

  const handleToggleStatus = async () => {
    if (!statusRule) return;
    const nextStatus: RuleStatus = statusRule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updatedRules = [{ ...statusRule, status: nextStatus }];
    const duplicate = updatedRules.find((rule) => findDuplicateRule(config.rules, rule));
    if (duplicate) {
      toast({
        title: 'नियम सक्रिय गर्न सकिएन',
        description: 'यस्तै सक्रिय नियम पहिले नै छ। सक्रिय गर्नुअघि अर्को नियम निष्क्रिय गर्नुहोस्।',
        variant: 'destructive',
      });
      setStatusRule(null);
      return;
    }
    const nextConfig = {
      ...config,
      rules: config.rules.map((rule) => updatedRules.find((updatedRule) => updatedRule.id === rule.id) ?? rule),
    };
    await save(nextConfig);
    toast({
      title: nextStatus === 'ACTIVE' ? 'नियम सक्रिय गरियो' : 'नियम निष्क्रिय गरियो',
      description: 'नियमको इतिहास सुरक्षित राखिएको छ।',
    });
    setStatusRule(null);
  };

  const handleDeleteVehicleRule = async () => {
    if (!deletingRule || deletingRule.scope !== 'VEHICLE_TYPE') return;
    const nextConfig = {
      ...config,
      rules: config.rules.filter((rule) => rule.id !== deletingRule.id),
    };
    await save(nextConfig);
    const feeHeadName = config.feeHeads.find((feeHead) => feeHead.id === deletingRule.feeHeadId)?.name
      ?? deletingRule.feeHeadId;
    const vehicleCategoryName = vehicleCategories.find((category) => category.id === deletingRule.vehicleCategoryId)?.category
      ?? deletingRule.vehicleCategoryId
      ?? '';
    toast({
      title: 'सवारी प्रकारको नियम हटाइयो',
      description: `${feeHeadName} को ${vehicleCategoryName} सवारी प्रकारसँगको शुल्क नियम हटाइयो। शुल्क शीर्षक सुरक्षित छ।`,
    });
    setDeletingRule(null);
  };

  const handleSortChange = (column: BillingRuleSortColumn, direction: 'asc' | 'desc' | null) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleUpdatePolicy = (rule: BillingRule) => {
    const feeHeadName = config.feeHeads.find((item) => item.id === rule.feeHeadId)?.name ?? rule.feeHeadId;
    toast({
      title: 'पॉलिसी अपडेट',
      description: `${feeHeadName} को पॉलिसी अपडेट इन्टरफेस आगामी विकासको लागि तयार गरिएको छ।`,
    });
  };

  const summaryCards = [
    { label: 'कुल नियमहरू', value: totalRules, accent: 'text-foreground' },
    { label: 'सवारी प्रकारका नियम', value: vehicleTypeRules, accent: 'text-primary' },
    { label: 'साझा नियम', value: commonRules, accent: 'text-amber-600' },
    { label: 'सक्रिय नियम', value: activeRules, accent: 'text-emerald-600' },
  ];

  const tableEmptyState = hasSearch
    ? {
        title: 'खोजिएका नियम भेटिएनन्',
        description: 'खोजिएको मापदण्डसँग मिल्ने नियमहरू छैनन्। अर्को खोज वा फिल्टर प्रयोग गर्नुहोस्।',
      }
    : totalRules === 0
      ? {
          title: 'बिलिङ नियम खाली छ',
          description: 'पहिलो बिलिङ नियम बनाउन “नयाँ नियम थप्नुहोस्” चयन गर्नुहोस्।',
        }
    : {
        title: scope === 'VEHICLE_TYPE' ? 'सवारी प्रकारका नियम भेटिएनन्' : 'साझा नियम भेटिएनन्',
        description: 'फिल्टर परिवर्तन गर्नुहोस् वा नयाँ बिलिङ नियम थप्नुहोस्।',
      };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-10">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">Billing Rules</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            आर्थिक वर्ष, शुल्क शीर्षक, सवारी प्रकार र Billing Entity अनुसार लागु हुने शुल्क नियमहरू व्यवस्थापन गर्नुहोस्।
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end md:items-end">
          <div className="w-full space-y-2 sm:max-w-xs">
            <label className="text-sm font-medium text-foreground" htmlFor="billing-rules-fiscal-year">आर्थिक वर्ष</label>
            <Select value={fiscalYearFilter} onValueChange={(value) => { setFiscalYearChoice(value); setPage(1); }}>
              <SelectTrigger id="billing-rules-fiscal-year" aria-label={t('forms.selectFiscalYear')}>
                <SelectValue placeholder={t('forms.selectFiscalYear')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allFiscalYears')}</SelectItem>
                {availableFiscalYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {formatFiscalYearForDisplay(year.code ?? year.name)}{year.status === 'INACTIVE' ? ' · इतिहास' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isRuleEditorOpen ? (
            <Button type="button" onClick={openCreateDialog} disabled={!hasLoaded} leftIcon={<Plus className="h-4 w-4" />} className="shrink-0">
              नयाँ नियम थप्नुहोस्
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/[0.035] px-4 py-3.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          बिलिङ नियमहरू परिवर्तन गर्न सकिन्छ। नयाँ परिवर्तन भविष्यका बिलिङमा लागू हुनेछ। अघिल्लो आर्थिक वर्षका नियमहरू इतिहास तथा अडिटका लागि सुरक्षित राख्नुहोस्।
        </p>
      </div>

      {vehicleError ? (
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-sm text-foreground" role="status">
          सवारी प्रकारको सूची लोड भएन। साझा नियमहरू उपलब्ध छन्; सवारी नियमका लागि सूची फेरि लोड गर्नुहोस्।
        </div>
      ) : null}

      {error ? (
        <ErrorState
          title={hasLoaded ? 'नियमहरू अद्यावधिक हुन सकेनन्' : 'नियमहरू लोड हुन सकेनन्'}
          description={error}
          retryLabel="फेरि प्रयास गर्नुहोस्"
          onRetry={() => void reload()}
        />
      ) : null}

      {isRuleEditorOpen ? (
        <section className="space-y-5 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6" aria-label="बिलिङ नियम सम्पादन">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm">
              <li>
                <Button type="button" variant="link" className="h-auto gap-1 p-0" onClick={closeRuleEditor}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Billing Rules List
                </Button>
              </li>
              <li aria-hidden="true" className="text-muted-foreground">/</li>
              <li aria-current="page" className="text-muted-foreground">
                {editRuleId || editingRule ? 'Edit Rule' : 'New Rule'}
              </li>
            </ol>
          </nav>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{editRuleId || editingRule ? 'बिलिङ नियम सम्पादन' : 'नयाँ बिलिङ नियम'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editRuleId || editingRule ? 'नियमका विवरण परिवर्तन गरी सुरक्षित गर्नुहोस्।' : 'नयाँ Common Rule वा Vehicle Type Rule तयार गर्नुहोस्।'}
            </p>
          </div>
          {editRuleId && error ? (
            <ErrorState
              title="बिलिङ नियम लोड हुन सकेन"
              description={error}
              retryLabel="फेरि प्रयास गर्नुहोस्"
              onRetry={() => void reload()}
            />
          ) : editRuleId && !hasLoaded ? (
            <p role="status" className="text-sm text-muted-foreground">बिलिङ नियम लोड हुँदैछ...</p>
          ) : editRuleId && !editingRule ? (
            <ErrorState
              title="बिलिङ नियम भेटिएन"
              description="यो नियम हटाइएको वा उपलब्ध नभएको हुन सक्छ।"
              retryLabel="फेरि प्रयास गर्नुहोस्"
              onRetry={() => void reload()}
            />
          ) : (
            <BillingRuleForm
              key={editingRule?.id ?? `new-${scope}`}
              initialRule={editingRule}
              initialRules={config.rules.filter((rule) => rule.scope === 'VEHICLE_TYPE')}
              config={config}
              vehicleCategories={vehicleCategories}
              billingEntities={billingEntities}
              isLoadingBillingEntities={isLoadingBillingEntities}
              billingEntitiesError={billingEntitiesError}
              onReloadBillingEntities={() => void reloadBillingEntities()}
              currentFiscalYearId={editingRule?.fiscalYearId ?? fiscalYearFilter}
              currentScope={editingRule?.scope ?? scope}
              isSaving={isSaving}
              onCancel={closeRuleEditor}
              onSubmit={handleSaveRule}
              onSubmitCommonRules={handleSaveCommonRules}
              onSubmitVehicleRules={handleSaveVehicleRules}
            />
          )}
        </section>
      ) : (
      <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Billing Rules">
        <div className="grid gap-3 md:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-border/70 bg-background/60">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className={`mt-2 text-2xl font-semibold ${card.accent}`}>{card.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Tabs value={scope} onValueChange={(value: string) => { setScope(value as Scope); setPage(1); }}>
            <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-grid sm:w-auto">
              <TabsTrigger value="VEHICLE_TYPE">Vehicle Type Rules</TabsTrigger>
              <TabsTrigger value="COMMON">Common Rules</TabsTrigger>
            </TabsList>
          </Tabs>

          <DataTableToolbar
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="शुल्क शीर्षक, आर्थिक वर्ष, सवारी प्रकार खोज्नुहोस्"
            className="items-end"
          >
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              {scope === 'COMMON' ? (
                <Select value={feeHeadFilter} onValueChange={(value) => { setFeeHeadFilter(value); setPage(1); }}>
                  <SelectTrigger className="w-44" aria-label="शुल्क शीर्षक अनुसार फिल्टर"><SelectValue placeholder="सबै शुल्क शीर्षक" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">सबै शुल्क शीर्षक</SelectItem>
                    {config.feeHeads.map((feeHead) => <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              <Select
                value={entityFilter}
                onValueChange={(value) => { setEntityFilter(value); setPage(1); }}
                disabled={isLoadingBillingEntities || Boolean(billingEntitiesError)}
              >
                <SelectTrigger className="w-44" aria-label="Billing Entity अनुसार फिल्टर"><SelectValue placeholder="सबै Billing Entity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">सबै Billing Entity</SelectItem>
                  {billingEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.entity}{entity.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {billingEntitiesError ? (
                <span role="alert" className="text-xs text-destructive">
                  Billing Entity लोड गर्न सकिएन: {billingEntitiesError}
                  <Button type="button" variant="link" size="xs" className="h-auto p-0" onClick={() => void reloadBillingEntities()}>
                    पुनः प्रयास
                  </Button>
                </span>
              ) : null}
              <Select value={frequencyFilter} onValueChange={(value) => { setFrequencyFilter(value as Frequency | 'all'); setPage(1); }}>
                <SelectTrigger className="w-40" aria-label="शुल्क प्रकार अनुसार फिल्टर"><SelectValue placeholder="सबै शुल्क प्रकार" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">सबै शुल्क प्रकार</SelectItem>
                  <SelectItem value="ONE_TIME">एकपटक</SelectItem>
                  <SelectItem value="PERIODIC">आवधिक</SelectItem>
                </SelectContent>
              </Select>

              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                फिल्टर हटाउनुहोस्
              </Button>
            </div>
          </DataTableToolbar>
        </div>

        <BillingRulesTable
          rules={pageRules}
          vehicleTypeFeeHeadIds={vehicleTypeFeeHeadIds}
          feeHeads={config.feeHeads}
          fiscalYears={config.fiscalYears}
          fiscalYearFilter={fiscalYearFilter}
          vehicleCategories={vehicleCategories}
          billingEntities={billingEntities}
          scope={scope}
          vehicleCategoryFilter={activeVehicleCategoryFilter}
          onVehicleCategoryFilterChange={(value) => { setVehicleCategoryFilter(value); setPage(1); }}
          isLoading={isLoading}
          firstRowNumber={(currentPage - 1) * PAGE_SIZE + 1}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          onView={setViewingRule}
          onEdit={openEditDialog}
          onDeleteRule={setDeletingRule}
          onBillingEntityChange={(rule, billingEntityId) => void handleBillingEntityChange(rule, billingEntityId)}
          onUpdatePolicy={handleUpdatePolicy}
          onToggleStatus={setStatusRule}
          isSaving={isSaving}
          emptyState={tableEmptyState}
        />

        <DataTablePagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={pageTotal}
          onPageChange={setPage}
        />
      </section>
      )}

      <FeeHeadManager
        feeHeads={config.feeHeads}
        fiscalYears={config.fiscalYears}
        rules={config.rules}
        onCreate={addFeeHead}
        onUpdate={updateFeeHead}
      />

      <BillingRuleDetailsDialog
        open={Boolean(viewingRule)}
        onOpenChange={(open) => { if (!open) setViewingRule(null); }}
        rule={viewingRule}
        feeHeads={config.feeHeads}
        fiscalYears={config.fiscalYears}
        billingEntities={billingEntities}
        vehicleCategoryName={viewingRule?.vehicleCategoryId ? vehicleCategories.find((category) => category.id === viewingRule.vehicleCategoryId)?.category : undefined}
      />
      
      <ConfirmDialog
        open={Boolean(statusRule)}
        onOpenChange={(open) => { if (!open) setStatusRule(null); }}
        title={statusRule?.status === 'ACTIVE' ? 'नियम निष्क्रिय गर्ने?' : 'नियम सक्रिय गर्ने?'}
        description={statusRule?.status === 'ACTIVE'
          ? 'यो नियम नयाँ बिलिङमा लागू हुने छैन। पुरानो नियम तथा बिलिङ इतिहास सुरक्षित रहनेछ।'
          : 'यो नियम आगामी बिलिङका लागि फेरि लागू हुनेछ।'}
        confirmLabel={statusRule?.status === 'ACTIVE' ? 'निष्क्रिय गर्नुहोस्' : 'सक्रिय गर्नुहोस्'}
        confirmVariant={statusRule?.status === 'ACTIVE' ? 'destructive' : 'default'}
        isLoading={isSaving}
        onConfirm={handleToggleStatus}
      />
      <ConfirmDialog
        open={Boolean(deletingRule)}
        onOpenChange={(open) => { if (!open) setDeletingRule(null); }}
        title="सवारी प्रकारको नियम हटाउने?"
        description="यो सवारी प्रकारका लागि सेट गरिएको रकम, Billing Entity र नियम विवरण हट्नेछ। शुल्क शीर्षक र पहिलेका बिलिङ अभिलेख सुरक्षित रहनेछन्।"
        confirmLabel="नियम हटाउनुहोस्"
        confirmVariant="destructive"
        isLoading={isSaving}
        onConfirm={handleDeleteVehicleRule}
        onError={(deleteError) => toast({
          title: 'सवारी प्रकारको नियम हटाउन सकिएन',
          description: deleteError instanceof Error ? deleteError.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
          variant: 'destructive',
        })}
      />
    </div>
  );
}