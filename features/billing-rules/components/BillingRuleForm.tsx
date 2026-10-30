'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Car, Layers, Plus, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingRule, BillingRuleConfig, FeeHead, Frequency, Scope, Validity } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { VehicleTypeRuleMatrix, type VehicleRuleSubmission } from '@/features/billing-rules/components/VehicleTypeRuleMatrix';
import { useTranslations } from '@/utils/translations';

export interface BillingRuleFormProps {
  initialRule?: BillingRule | null;
  initialRules?: BillingRule[];
  config: BillingRuleConfig;
  vehicleCategories: VehicleTypeRecord[];
  billingEntities: BillingEntityRecord[];
  isLoadingBillingEntities?: boolean;
  billingEntitiesError?: string | null;
  onReloadBillingEntities?: () => void;
  currentFiscalYearId?: string;
  currentScope?: Scope;
  isSaving?: boolean;
  onCancel: () => void;
  onSubmit: (rule: BillingRule, feeHead: FeeHead) => void | Promise<void>;
  onSubmitCommonRules?: (items: Array<{ rule: BillingRule; feeHead: FeeHead }>) => void | Promise<void>;
  onSubmitVehicleRules?: (submission: VehicleRuleSubmission) => void | Promise<void>;
}

interface CommonRuleFormRow {
  id: string;
  feeHeadId: string;
  amount: string;
  frequency: Frequency;
  validity: Validity;
  billingEntityId: string | null;
}

const validityOptions: Array<{ value: Validity; label: string }> = [
  { value: 'SAME_DAY', label: 'सोही दिन' },
  { value: 'END_OF_MONTH', label: 'महिनाको अन्त्य' },
  { value: 'END_OF_FISCAL_YEAR', label: 'आर्थिक वर्षको अन्त्य' },
];

function dateInputValueToDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

function dateToInputValue(date: Date | undefined): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function BillingRuleForm({
  initialRule,
  initialRules = [],
  config,
  vehicleCategories,
  billingEntities,
  isLoadingBillingEntities = false,
  billingEntitiesError,
  onReloadBillingEntities,
  currentFiscalYearId,
  currentScope = 'COMMON',
  isSaving = false,
  onCancel,
  onSubmit,
  onSubmitCommonRules,
  onSubmitVehicleRules,
}: BillingRuleFormProps) {
  const { t } = useTranslations();
  const feeHeads = config.feeHeads;
  const defaultFiscalYear = config.fiscalYears.find((year) => year.status === 'ACTIVE' && year.isDefault)
    ?? config.fiscalYears.find((year) => year.status === 'ACTIVE')
    ?? config.fiscalYears[0];
  const initialFiscalYearId = currentFiscalYearId && currentFiscalYearId !== 'all'
    ? currentFiscalYearId
    : defaultFiscalYear?.id ?? '';
  const initialFeeHeadId = config.feeHeads.find((feeHead) => feeHead.fiscalYearId === initialFiscalYearId)?.id ?? '';
  const [rule, setRule] = useState<BillingRule | null>(() => initialRule ?? {
    id: crypto.randomUUID(),
    feeHeadId: initialFeeHeadId,
    fiscalYearId: initialFiscalYearId,
    billingEntityId: null,
    scope: currentScope,
    vehicleCategoryId: currentScope === 'VEHICLE_TYPE' ? vehicleCategories[0]?.id ?? null : null,
    frequency: 'ONE_TIME',
    period: currentScope === 'COMMON' ? null : 'FISCAL_YEAR',
    validity: 'SAME_DAY',
    amount: 0,
    status: 'ACTIVE',
  });
  const [amount, setAmount] = useState(initialRule ? String(initialRule.amount) : '');
  const [effectiveDate, setEffectiveDate] = useState(initialRule?.effectiveDate ?? '');
  const [meetingReference, setMeetingReference] = useState(initialRule?.meetingReference ?? '');
  const [meetingDocument, setMeetingDocument] = useState<File | null>(null);
  const meetingDocumentInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [commonRows, setCommonRows] = useState<CommonRuleFormRow[]>(() => [{
    id: crypto.randomUUID(),
    feeHeadId: initialRule?.feeHeadId ?? initialFeeHeadId,
    amount: initialRule ? String(initialRule.amount) : '',
    frequency: initialRule?.frequency ?? 'ONE_TIME',
    validity: initialRule?.validity ?? 'SAME_DAY',
    billingEntityId: initialRule?.billingEntityId ?? null,
  }]);
  const selectableEntities = billingEntities;
  const selectedBillingEntity = selectableEntities.find((entity) => entity.id === rule?.billingEntityId);
  const canKeepExistingBillingEntity = Boolean(
    initialRule?.billingEntityId && initialRule.billingEntityId === rule?.billingEntityId,
  );
  const hasValidBillingEntity = Boolean(rule?.billingEntityId)
    && (Boolean(selectedBillingEntity) || canKeepExistingBillingEntity);
  if (!rule) {
    return (
      <div className="space-y-4">
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          बिलिङ नियमको विवरण उपलब्ध छैन।
        </div>
      </div>
    );
  }

  const clearFieldError = (field: string) => {
    setFormError('');
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const setField = <K extends keyof BillingRule>(field: K, value: BillingRule[K]) => {
    clearFieldError(field);
    setRule((current) => current ? { ...current, [field]: value } : current);
  };
  const feeHeadsForYear = feeHeads.filter((feeHead) => {
    const isExistingRuleHead = initialRule?.feeHeadId === feeHead.id && initialRule.fiscalYearId === rule.fiscalYearId;
    return feeHead.fiscalYearId === rule.fiscalYearId
      && (feeHead.status === 'ACTIVE' || isExistingRuleHead)
      || (isExistingRuleHead && feeHead.fiscalYearId === null);
  });

  if (rule.scope === 'VEHICLE_TYPE' && onSubmitVehicleRules) {
    return (
      <div className="space-y-5">
        <Tabs
          value={rule.scope}
          onValueChange={(value) => {
            const scope = value as Scope;
            setRule((current) => current ? {
              ...current,
              scope,
              vehicleCategoryId: scope === 'COMMON' ? null : current.vehicleCategoryId ?? vehicleCategories[0]?.id ?? null,
              period: current.frequency === 'ONE_TIME'
                ? scope === 'COMMON' ? null : 'FISCAL_YEAR'
                : 'MONTH',
            } : current);
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-grid sm:w-auto">
            <TabsTrigger value="COMMON" className="gap-2">
              <Layers className="h-4 w-4" aria-hidden="true" />
              Common Rule
            </TabsTrigger>
            <TabsTrigger value="VEHICLE_TYPE" className="gap-2">
              <Car className="h-4 w-4" aria-hidden="true" />
              Vehicle Type Rule
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <VehicleTypeRuleMatrix
          config={config}
          initialRule={initialRule}
          initialRules={initialRules}
          vehicleCategories={vehicleCategories}
          billingEntities={billingEntities}
          currentFiscalYearId={rule.fiscalYearId}
          isLoadingBillingEntities={isLoadingBillingEntities}
          billingEntitiesError={billingEntitiesError}
          isSaving={isSaving}
          onReloadBillingEntities={onReloadBillingEntities}
          onCancel={onCancel}
          onSubmit={onSubmitVehicleRules}
        />
      </div>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const errors: Record<string, string> = {};
    if (!rule.fiscalYearId) errors.fiscalYearId = t('billing.ruleForm.fiscalYearRequired');
    if (rule.scope === 'COMMON' && !effectiveDate) errors.effectiveDate = t('billing.ruleForm.effectiveDateRequired');
    const reference = meetingReference.trim();
    if (rule.scope === 'COMMON' && !reference) errors.meetingReference = t('billing.ruleForm.meetingReferenceRequired');
    if (meetingDocument) {
      setFormError(t('billing.ruleForm.meetingDocumentUnavailable'));
      return;
    }
    if (rule.scope === 'COMMON' && !initialRule && onSubmitCommonRules) {
      commonRows.forEach((row) => {
        const parsedAmount = Number(row.amount);
        if (!row.feeHeadId) errors[`${row.id}.feeHeadId`] = t('billing.ruleForm.feeHeadRequired');
        if (!row.amount.trim()) errors[`${row.id}.amount`] = t('billing.ruleForm.amountRequired');
        else if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          errors[`${row.id}.amount`] = t('billing.ruleForm.amountNonnegative');
        }
        if (!row.billingEntityId) {
          errors[`${row.id}.billingEntityId`] = isLoadingBillingEntities || billingEntitiesError
            ? t('billing.ruleForm.billingEntityUnavailable')
            : t('billing.ruleForm.billingEntityRequired');
        }
      });
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setFormError(t('billing.ruleForm.completeRequired'));
        const firstInvalidRow = commonRows.find((row) =>
          errors[`${row.id}.feeHeadId`] || errors[`${row.id}.amount`] || errors[`${row.id}.billingEntityId`],
        );
        if (firstInvalidRow) {
          const firstInvalidField = ['feeHeadId', 'amount', 'billingEntityId']
            .find((field) => errors[`${firstInvalidRow.id}.${field}`]);
          if (firstInvalidField) {
            window.requestAnimationFrame(() => document.getElementById(`common-rule-row-${firstInvalidRow.id}-${firstInvalidField}`)?.focus());
          }
        }
        return;
      }
      const items = commonRows.map((row) => {
        const parsedAmount = Number(row.amount);
        const feeHead = feeHeadsForYear.find((item) => item.id === row.feeHeadId);
        if (!feeHead || !row.billingEntityId || !Number.isFinite(parsedAmount) || parsedAmount < 0) return null;

        const commonRule: BillingRule = {
          id: row.id,
          feeHeadId: row.feeHeadId,
          fiscalYearId: rule.fiscalYearId,
          billingEntityId: row.billingEntityId,
          scope: 'COMMON',
          vehicleCategoryId: null,
          frequency: row.frequency,
          period: row.frequency === 'ONE_TIME' ? null : 'MONTH',
          validity: row.validity,
          amount: parsedAmount,
          status: rule.status,
          effectiveDate,
          meetingReference: reference,
        };

        return {
          feeHead,
          rule: commonRule,
        };
      });
      if (items.some((item) => item === null)) {
        setFormError(t('billing.ruleForm.completeRequired'));
        return;
      }
      void onSubmitCommonRules(items.filter((item): item is NonNullable<typeof item> => item !== null));
      return;
    }
    const parsedAmount = Number(amount);
    if (!rule.feeHeadId) errors.feeHeadId = t('billing.ruleForm.feeHeadRequired');
    if (!amount.trim()) errors.amount = t('billing.ruleForm.amountRequired');
    else if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || (rule.scope === 'VEHICLE_TYPE' && parsedAmount === 0)) {
      errors.amount = rule.scope === 'COMMON'
        ? t('billing.ruleForm.amountNonnegative')
        : t('billing.ruleForm.amountPositive');
    }
    if (!hasValidBillingEntity) errors.billingEntityId = isLoadingBillingEntities
      ? t('billing.ruleForm.billingEntityUnavailable')
      : t('billing.ruleForm.billingEntityRequired');
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(t('billing.ruleForm.completeRequired'));
      const fieldOrder = ['fiscalYearId', 'feeHeadId', 'amount', 'billingEntityId', 'effectiveDate', 'meetingReference'];
      const firstInvalidField = fieldOrder.find((field) => errors[field]);
      const invalidFieldIds: Record<string, string> = {
        fiscalYearId: 'common-rule-fiscalYearId',
        feeHeadId: 'common-rule-feeHeadId',
        amount: 'common-rule-amount',
        billingEntityId: 'common-rule-billingEntityId',
        effectiveDate: 'common-rule-effective-date',
        meetingReference: 'common-rule-meeting-reference',
      };
      if (firstInvalidField) {
        window.requestAnimationFrame(() => document.getElementById(invalidFieldIds[firstInvalidField])?.focus());
      }
      return;
    }
    const feeHead = feeHeadsForYear.find((item) => item.id === rule.feeHeadId);
    if (!feeHead) {
      setFieldErrors({ feeHeadId: t('billing.ruleForm.feeHeadRequired') });
      setFormError(t('billing.ruleForm.completeRequired'));
      return;
    }
    if (!selectedBillingEntity && !canKeepExistingBillingEntity) return;
    void onSubmit({
      ...rule,
      amount: parsedAmount,
      effectiveDate,
      meetingReference: reference,
      vehicleCategoryId: rule.scope === 'COMMON' ? null : rule.vehicleCategoryId,
      period: rule.frequency === 'ONE_TIME'
        ? rule.scope === 'COMMON' ? null : 'FISCAL_YEAR'
        : 'MONTH',
    }, feeHead);
  };

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <Tabs
        value={rule.scope}
        onValueChange={(value) => {
          const scope = value as Scope;
          setRule((current) => current ? {
            ...current,
            scope,
            vehicleCategoryId: scope === 'COMMON' ? null : current.vehicleCategoryId ?? vehicleCategories[0]?.id ?? null,
            period: current.frequency === 'ONE_TIME'
              ? scope === 'COMMON' ? null : 'FISCAL_YEAR'
              : 'MONTH',
          } : current);
        }}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-grid sm:w-auto">
          <TabsTrigger value="COMMON" className="gap-2">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Common Rule
          </TabsTrigger>
          <TabsTrigger value="VEHICLE_TYPE" className="gap-2">
            <Car className="h-4 w-4" aria-hidden="true" />
            Vehicle Type Rule
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
         <div>
          <h3 className="text-base font-semibold">Common Type Rule</h3>
          <p className="text-sm text-muted-foreground">यो नियम कुन सवारीमा लागू हुन्छ छान्नुहोस्।</p>
        </div>
        <div className={rule.scope === 'COMMON' ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-4 md:grid-cols-3'}>
          <div className="space-y-2">
            <Label htmlFor="common-rule-fiscal-year">
              वित्तीय वर्ष {rule.scope === 'COMMON' ? <span className="text-destructive">*</span> : null}
            </Label>
            <Select value={rule.fiscalYearId} onValueChange={(value) => {
              clearFieldError('fiscalYearId');
              const matchingFeeHeads = feeHeads.filter((feeHead) => feeHead.fiscalYearId === value
                && (feeHead.status === 'ACTIVE' || (initialRule?.feeHeadId === feeHead.id && initialRule.fiscalYearId === value)));
              setRule((current) => current ? {
                ...current,
                fiscalYearId: value,
                feeHeadId: matchingFeeHeads.some((feeHead) => feeHead.id === current.feeHeadId)
                  ? current.feeHeadId
                  : matchingFeeHeads[0]?.id ?? '',
              } : current);
              setCommonRows((rows) => rows.map((row) => ({
                ...row,
                feeHeadId: matchingFeeHeads.some((feeHead) => feeHead.id === row.feeHeadId)
                  ? row.feeHeadId
                  : matchingFeeHeads[0]?.id ?? '',
              })));
            }}>
              <SelectTrigger id="common-rule-fiscalYearId" aria-invalid={Boolean(fieldErrors.fiscalYearId)} aria-describedby={fieldErrors.fiscalYearId ? 'common-rule-fiscalYearId-error' : undefined}>
                <SelectValue placeholder="वित्तीय वर्ष छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                {config.fiscalYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.fiscalYearId ? <p id="common-rule-fiscalYearId-error" role="alert" className="text-xs text-destructive">{fieldErrors.fiscalYearId}</p> : null}
          </div>

          {rule.scope === 'COMMON' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="common-rule-effective-date">लागु मिति <span className="text-destructive">*</span></Label>
                <NepaliDatePicker
                  id="common-rule-effective-date"
                  value={dateInputValueToDate(effectiveDate)}
                  onChange={(date) => {
                    setEffectiveDate(dateToInputValue(date));
                    clearFieldError('effectiveDate');
                  }}
                  placeholder="मिति छान्नुहोस्..."
                  required
                  aria-invalid={Boolean(fieldErrors.effectiveDate)}
                  aria-describedby={fieldErrors.effectiveDate ? 'common-rule-effectiveDate-error' : undefined}
                />
                {fieldErrors.effectiveDate ? <p id="common-rule-effectiveDate-error" role="alert" className="text-xs text-destructive">{fieldErrors.effectiveDate}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="common-rule-meeting-reference">कुन मिटिङबाट पास <span className="text-destructive">*</span></Label>
                <Input
                  id="common-rule-meeting-reference"
                  value={meetingReference}
                  onChange={(event) => {
                    setMeetingReference(event.target.value);
                    clearFieldError('meetingReference');
                  }}
                  placeholder="उदाहरण: २०८२/०३/२१ को सञ्चालक समिति बैठक"
                  aria-invalid={Boolean(fieldErrors.meetingReference)}
                  aria-describedby={fieldErrors.meetingReference ? 'common-rule-meetingReference-error' : undefined}
                />
                {fieldErrors.meetingReference ? <p id="common-rule-meetingReference-error" role="alert" className="text-xs text-destructive">{fieldErrors.meetingReference}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="common-rule-meeting-document">मिटिङ कागजात</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={meetingDocumentInputRef}
                    id="common-rule-meeting-document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,application/pdf,image/jpeg,image/png,image/gif,image/webp"
                    disabled={isSaving}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                      if (file && !supportedTypes.includes(file.type)) {
                        setMeetingDocument(null);
                        event.target.value = '';
                        setFormError('PDF, JPEG, PNG, GIF वा WebP फाइल मात्र चयन गर्नुहोस्।');
                        return;
                      }
                      setMeetingDocument(file);
                      setFormError('');
                    }}
                    className="file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                  />
                  {meetingDocument ? (
                    <TableActionIconButton
                      aria-label="चयन गरिएको मिटिङ कागजात हटाउनुहोस्"
                      onClick={() => {
                        setMeetingDocument(null);
                        if (meetingDocumentInputRef.current) meetingDocumentInputRef.current.value = '';
                      }}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </TableActionIconButton>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Upload className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  हाललाई अपलोड API उपलब्ध छैन। मान्य: PDF, JPEG, PNG, GIF, WebP
                </p>
              </div>
            </>
          ) : null}

          {rule.scope === 'VEHICLE_TYPE' ? <div className="space-y-2">
            <Label htmlFor="common-rule-fee-head">शुल्क शीर्षक</Label>
            <Select value={rule.feeHeadId} onValueChange={(value) => setField('feeHeadId', value)}>
              <SelectTrigger id="common-rule-fee-head">
                <SelectValue placeholder="शुल्क शीर्षक छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                {feeHeadsForYear.map((feeHead) => (
                  <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> : null}

          {rule.scope === 'VEHICLE_TYPE' ? (
            <div className="space-y-2">
              <Label htmlFor="common-rule-vehicle-category">सवारी श्रेणी</Label>
              <Select
                value={rule.vehicleCategoryId ?? ''}
                onValueChange={(value) => setField('vehicleCategoryId', value)}
              >
                <SelectTrigger id="common-rule-vehicle-category">
                  <SelectValue placeholder="सवारी श्रेणी छान्नुहोस्" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>{category.category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {rule.scope === 'VEHICLE_TYPE' ? <div className="space-y-2">
            <Label htmlFor="common-rule-billing-entity">Billing Entity</Label>
            <Select
              value={rule.billingEntityId ?? ''}
              onValueChange={(value) => {
                const entity = selectableEntities.find((record) => record.id === value);
                if (entity) {
                  setRule((current) => current
                    ? { ...current, billingEntityId: entity.id }
                    : current);
                }
              }}
              disabled={isLoadingBillingEntities || selectableEntities.length === 0 || Boolean(billingEntitiesError)}
            >
              <SelectTrigger id="common-rule-billing-entity">
                <SelectValue
                  placeholder={
                    isLoadingBillingEntities
                      ? 'संस्था लोड हुँदैछ...'
                      : billingEntitiesError
                        ? 'संस्था लोड गर्न सकिएन'
                        : 'संस्था छान्नुहोस्'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectableEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.entity}{entity.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {billingEntitiesError ? (
              <p role="alert" className="text-xs text-destructive">
                Billing Entity लोड गर्न सकिएन: {billingEntitiesError}
                {onReloadBillingEntities ? (
                  <Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={onReloadBillingEntities}>
                    पुनः प्रयास
                  </Button>
                ) : null}
              </p>
            ) : !isLoadingBillingEntities && selectableEntities.length === 0 ? (
              <p role="alert" className="text-xs text-destructive">Billing Entity सूची खाली छ।</p>
            ) : null}
          </div> : null}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">सि.नं.</TableHead>
                <TableHead className="min-w-56">नियमको नाम{rule.scope === 'COMMON' ? ' *' : ''}</TableHead>
                <TableHead className="min-w-32">रकम{rule.scope === 'COMMON' ? ' *' : ''}</TableHead>
                <TableHead className="min-w-40">शुल्क प्रकार</TableHead>
                <TableHead className="min-w-44">मान्य अवधि अन्त्य</TableHead>
                {rule.scope === 'VEHICLE_TYPE' ? <TableHead className="min-w-40">अवधि</TableHead> : null}
                <TableHead className="min-w-48">Billing Entity *</TableHead>
                {rule.scope === 'COMMON' && !initialRule && onSubmitCommonRules ? (
                  <TableHead className="w-12 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Common Rule पंक्ति थप्नुहोस्"
                      onClick={() => setCommonRows((rows) => [...rows, {
                        id: crypto.randomUUID(),
                        feeHeadId: feeHeadsForYear.find((feeHead) => !rows.some((row) => row.feeHeadId === feeHead.id))?.id ?? '',
                        amount: '',
                        frequency: 'ONE_TIME',
                        validity: 'SAME_DAY',
                        billingEntityId: null,
                      }])}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rule.scope === 'COMMON' && !initialRule && onSubmitCommonRules ? commonRows.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <Select
                    value={row.feeHeadId}
                    onValueChange={(value) => {
                      setCommonRows((rows) => rows.map((item) => item.id === row.id ? { ...item, feeHeadId: value } : item));
                      clearFieldError(`${row.id}.feeHeadId`);
                    }}
                  >
                    <SelectTrigger
                      id={`common-rule-row-${row.id}-feeHeadId`}
                      aria-label={`नियमको नाम ${index + 1}`}
                      aria-invalid={Boolean(fieldErrors[`${row.id}.feeHeadId`])}
                      aria-describedby={fieldErrors[`${row.id}.feeHeadId`] ? `common-rule-row-${row.id}-feeHeadId-error` : undefined}
                    ><SelectValue placeholder="शुल्क शीर्षक छान्नुहोस्" /></SelectTrigger>
                    <SelectContent>
                      {feeHeadsForYear.map((feeHead) => (
                        <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors[`${row.id}.feeHeadId`] ? <p id={`common-rule-row-${row.id}-feeHeadId-error`} role="alert" className="mt-1 text-xs text-destructive">{fieldErrors[`${row.id}.feeHeadId`]}</p> : null}
                </TableCell>
                <TableCell>
                  <Input
                    id={`common-rule-row-${row.id}-amount`}
                    aria-label={`रकम ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.amount}
                    onChange={(event) => {
                      setCommonRows((rows) => rows.map((item) => item.id === row.id ? { ...item, amount: event.target.value } : item));
                      clearFieldError(`${row.id}.amount`);
                    }}
                    aria-invalid={Boolean(fieldErrors[`${row.id}.amount`])}
                    aria-describedby={fieldErrors[`${row.id}.amount`] ? `common-rule-row-${row.id}-amount-error` : undefined}
                    className="min-w-24"
                  />
                  {fieldErrors[`${row.id}.amount`] ? <p id={`common-rule-row-${row.id}-amount-error`} role="alert" className="mt-1 text-xs text-destructive">{fieldErrors[`${row.id}.amount`]}</p> : null}
                </TableCell>
                <TableCell>
                  <Select value={row.frequency} onValueChange={(value) => setCommonRows((rows) => rows.map((item) => item.id === row.id ? { ...item, frequency: value as Frequency } : item))}>
                    <SelectTrigger aria-label={`शुल्क प्रकार ${index + 1}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ONE_TIME">एकपटक</SelectItem><SelectItem value="PERIODIC">आवधिक</SelectItem></SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={row.validity} onValueChange={(value) => setCommonRows((rows) => rows.map((item) => item.id === row.id ? { ...item, validity: value as Validity } : item))}>
                    <SelectTrigger aria-label={`मान्य अवधि अन्त्य ${index + 1}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{validityOptions.map((validity) => <SelectItem key={validity.value} value={validity.value}>{validity.label}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={row.billingEntityId ?? ''}
                    onValueChange={(value) => {
                      setCommonRows((rows) => rows.map((item) => item.id === row.id ? { ...item, billingEntityId: value } : item));
                      clearFieldError(`${row.id}.billingEntityId`);
                    }}
                    disabled={isLoadingBillingEntities || selectableEntities.length === 0 || Boolean(billingEntitiesError)}
                  >
                    <SelectTrigger
                      id={`common-rule-row-${row.id}-billingEntityId`}
                      aria-label={`Billing Entity ${index + 1}`}
                      aria-invalid={Boolean(fieldErrors[`${row.id}.billingEntityId`])}
                      aria-describedby={fieldErrors[`${row.id}.billingEntityId`] ? `common-rule-row-${row.id}-billingEntityId-error` : undefined}
                      className="min-w-40"
                    ><SelectValue placeholder={isLoadingBillingEntities ? 'संस्था लोड हुँदैछ...' : billingEntitiesError ? 'संस्था लोड गर्न सकिएन' : 'संस्था छान्नुहोस्'} /></SelectTrigger>
                    <SelectContent>{selectableEntities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.entity}{entity.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}</SelectItem>)}</SelectContent>
                  </Select>
                  {fieldErrors[`${row.id}.billingEntityId`] ? <p id={`common-rule-row-${row.id}-billingEntityId-error`} role="alert" className="mt-1 text-xs text-destructive">{fieldErrors[`${row.id}.billingEntityId`]}</p> : null}
                </TableCell>
                <TableCell className="text-center">
                  {commonRows.length > 1 ? <Button type="button" variant="ghost" size="icon-sm" aria-label={`पंक्ति ${index + 1} हटाउनुहोस्`}
                    onClick={() => setCommonRows((rows) => rows.filter((item) => item.id !== row.id))}>
                    <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                  </Button> : null}
                </TableCell>
              </TableRow>
              )) : <TableRow>
                <TableCell className="text-muted-foreground">1</TableCell>
                <TableCell>
                  <Select value={rule.feeHeadId} onValueChange={(value) => setField('feeHeadId', value)}>
                    <SelectTrigger
                      id="common-rule-feeHeadId"
                      aria-label="नियमको नाम"
                      aria-invalid={Boolean(fieldErrors.feeHeadId)}
                      aria-describedby={fieldErrors.feeHeadId ? 'common-rule-feeHeadId-error' : undefined}
                    ><SelectValue placeholder="शुल्क शीर्षक छान्नुहोस्" /></SelectTrigger>
                    <SelectContent>
                      {feeHeads.map((feeHead) => (
                        <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.feeHeadId ? <p id="common-rule-feeHeadId-error" role="alert" className="text-xs text-destructive">{fieldErrors.feeHeadId}</p> : null}
                </TableCell>
                <TableCell>
                  <Input
                    id="common-rule-amount"
                    aria-label="रकम"
                    type="number"
                    min={rule.scope === 'COMMON' ? '0' : '0.01'}
                    step="0.01"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      clearFieldError('amount');
                    }}
                    aria-invalid={Boolean(fieldErrors.amount)}
                    aria-describedby={fieldErrors.amount ? 'common-rule-amount-error' : undefined}
                    className="min-w-24"
                  />
                  {fieldErrors.amount ? <p id="common-rule-amount-error" role="alert" className="text-xs text-destructive">{fieldErrors.amount}</p> : null}
                </TableCell>
                <TableCell>
                  <Select
                    value={rule.frequency}
                    onValueChange={(value) => {
                      const frequency = value as Frequency;
                      setRule((current) => current ? {
                        ...current,
                        frequency,
                        period: frequency === 'ONE_TIME' ? null : 'MONTH',
                      } : current);
                    }}
                  >
                    <SelectTrigger aria-label="शुल्क प्रकार"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">एकपटक</SelectItem>
                      <SelectItem value="PERIODIC">आवधिक</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={rule.validity} onValueChange={(value) => setField('validity', value as Validity)}>
                    <SelectTrigger aria-label="मान्य अवधि अन्त्य"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {validityOptions.map((validity) => (
                        <SelectItem key={validity.value} value={validity.value}>{validity.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                {rule.scope === 'VEHICLE_TYPE' ? (
                  <TableCell>
                    <Select
                      value={rule.period ?? 'FISCAL_YEAR'}
                      onValueChange={(value) => setField('period', value as BillingRule['period'])}
                      disabled={rule.frequency === 'ONE_TIME'}
                    >
                      <SelectTrigger aria-label="अवधि"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FISCAL_YEAR">आर्थिक वर्ष</SelectItem>
                        <SelectItem value="MONTH">महिना</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                ) : null}
                <TableCell>
                  <Select
                    value={rule.billingEntityId ?? ''}
                    onValueChange={(value) => setField('billingEntityId', value)}
                    disabled={isLoadingBillingEntities || selectableEntities.length === 0 || Boolean(billingEntitiesError)}
                  >
                    <SelectTrigger
                      id="common-rule-billingEntityId"
                      aria-label="Billing Entity"
                      aria-invalid={Boolean(fieldErrors.billingEntityId)}
                      aria-describedby={fieldErrors.billingEntityId ? 'common-rule-billingEntityId-error' : undefined}
                    ><SelectValue placeholder="संस्था छान्नुहोस्" /></SelectTrigger>
                    <SelectContent>
                      {canKeepExistingBillingEntity && initialRule?.billingEntityId && !selectedBillingEntity ? (
                        <SelectItem value={initialRule.billingEntityId}>
                          हालको संस्था सूचीमा छैन ({initialRule.billingEntityId})
                        </SelectItem>
                      ) : null}
                      {selectableEntities.map((entity) => <SelectItem key={entity.id} value={entity.id}>{entity.entity}{entity.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {rule.scope === 'COMMON' && billingEntitiesError ? (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                      {t('billing.ruleForm.billingEntityUnavailable')}
                      {onReloadBillingEntities ? (
                        <Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={onReloadBillingEntities}>
                          पुनः प्रयास
                        </Button>
                      ) : null}
                    </p>
                  ) : null}
                  {rule.scope === 'COMMON' && !isLoadingBillingEntities && !billingEntitiesError && selectableEntities.length === 0 ? (
                    <p role="alert" className="mt-1 text-xs text-destructive">{t('billing.ruleForm.billingEntityRequired')}</p>
                  ) : null}
                  {fieldErrors.billingEntityId ? <p id="common-rule-billingEntityId-error" role="alert" className="text-xs text-destructive">{fieldErrors.billingEntityId}</p> : null}
                </TableCell>
                {rule.scope === 'COMMON' && !initialRule && onSubmitCommonRules ? <TableCell /> : null}
              </TableRow>}
            </TableBody>
          </Table>
        </div>
        {rule.scope === 'COMMON' ? (
          <p className="text-xs text-muted-foreground">{t('billing.ruleForm.zeroAmountHint')}</p>
        ) : null}

        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/20 p-3">
          <Checkbox
            id="billing-rule-active"
            checked={rule.status === 'ACTIVE'}
            onCheckedChange={(checked) => setField('status', checked === true ? 'ACTIVE' : 'INACTIVE')}
          />
          <Label htmlFor="billing-rule-active" className="cursor-pointer font-normal">नियम सक्रिय गर्नुहोस्</Label>
        </div>
      </section>

      {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          रद्द गर्नुहोस्
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'सुरक्षित हुँदैछ...' : initialRule ? 'अपडेट गर्नुहोस्' : 'सुरक्षित गर्नुहोस्'}
        </Button>
      </div>
    </form>
  );
}
