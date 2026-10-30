'use client';

import { Fragment, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NepaliDatePicker } from '@/components/ui/nepali-date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingRule, BillingRuleConfig, FeeHead, Frequency, Period, Validity } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

export interface VehicleRuleEntry {
  rule: BillingRule;
  feeHead: FeeHead;
}

export interface VehicleRuleSubmission {
  fiscalYearId: string;
  effectiveDate: string;
  meetingReference: string;
  editingVehicleCategoryId?: string;
  entries: VehicleRuleEntry[];
}

interface VehicleTypeRuleMatrixProps {
  config: BillingRuleConfig;
  initialRule?: BillingRule | null;
  initialRules: BillingRule[];
  vehicleCategories: VehicleTypeRecord[];
  billingEntities: BillingEntityRecord[];
  currentFiscalYearId: string;
  isLoadingBillingEntities: boolean;
  billingEntitiesError?: string | null;
  isSaving: boolean;
  onReloadBillingEntities?: () => void;
  onCancel: () => void;
  onSubmit: (submission: VehicleRuleSubmission) => void | Promise<void>;
}

interface FeeHeadColumn {
  id: string;
  feeHeadId: string;
  billingEntityId: string;
  frequency: Frequency;
  period: Period;
  validity: Validity;
}

interface VehicleRow {
  id: string;
  vehicleCategoryId: string;
  amounts: Record<string, string>;
  locked: boolean;
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

function makeColumn(feeHeadId = '', rule?: BillingRule, defaultBillingEntityId = ''): FeeHeadColumn {
  return {
    id: crypto.randomUUID(),
    feeHeadId,
    billingEntityId: rule?.billingEntityId ?? defaultBillingEntityId,
    frequency: rule?.frequency ?? 'PERIODIC',
    period: rule?.period === 'FISCAL_YEAR' || rule?.period === 'MONTH' ? rule.period : 'MONTH',
    validity: rule?.validity ?? 'SAME_DAY',
  };
}

function makeInitialColumns(
  config: BillingRuleConfig,
  rules: BillingRule[],
  fiscalYearId: string,
  defaultBillingEntityId: string,
  vehicleCategoryId?: string,
) {
  const yearRules = rules.filter((rule) =>
    rule.scope === 'VEHICLE_TYPE'
    && rule.fiscalYearId === fiscalYearId
    && (!vehicleCategoryId || rule.vehicleCategoryId === vehicleCategoryId),
  );
  const feeHeadIds = vehicleCategoryId
    ? Array.from(new Set(yearRules.map((rule) => rule.feeHeadId)))
    : [];
  if (feeHeadIds.length > 0) {
    return feeHeadIds.map((feeHeadId) => makeColumn(
      feeHeadId,
      yearRules.find((rule) => rule.feeHeadId === feeHeadId),
      defaultBillingEntityId,
    ));
  }
  const firstFeeHead = config.feeHeads.find((feeHead) =>
    feeHead.fiscalYearId === fiscalYearId && feeHead.status === 'ACTIVE',
  );
  return [makeColumn(firstFeeHead?.id ?? '', undefined, defaultBillingEntityId)];
}

function makeInitialRows(
  rules: BillingRule[],
  fiscalYearId: string,
  columns: FeeHeadColumn[],
  vehicleCategoryId?: string,
): VehicleRow[] {
  const yearRules = rules.filter((rule) => rule.scope === 'VEHICLE_TYPE' && rule.fiscalYearId === fiscalYearId);
  const selectedVehicleCategoryId = vehicleCategoryId ?? '';
  return [{
    id: crypto.randomUUID(),
    vehicleCategoryId: selectedVehicleCategoryId,
    locked: Boolean(vehicleCategoryId),
    amounts: Object.fromEntries(columns.map((column) => {
      const existing = yearRules.find((rule) =>
        rule.vehicleCategoryId === selectedVehicleCategoryId && rule.feeHeadId === column.feeHeadId,
      );
      return [column.id, existing ? String(existing.amount) : ''];
    })),
  }];
}

export function VehicleTypeRuleMatrix({
  config,
  initialRule,
  initialRules,
  vehicleCategories,
  billingEntities,
  currentFiscalYearId,
  isLoadingBillingEntities,
  billingEntitiesError,
  isSaving,
  onReloadBillingEntities,
  onCancel,
  onSubmit,
}: VehicleTypeRuleMatrixProps) {
  const initialYearId = initialRule?.fiscalYearId ?? currentFiscalYearId;
  const [fiscalYearId, setFiscalYearId] = useState(initialYearId);
  const [effectiveDate, setEffectiveDate] = useState(initialRule?.effectiveDate ?? '');
  const [meetingReference, setMeetingReference] = useState(initialRule?.meetingReference ?? '');
  const [meetingDocument, setMeetingDocument] = useState<File | null>(null);
  const meetingDocumentInputRef = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState(() => makeInitialColumns(
    config,
    initialRules,
    initialYearId,
    billingEntities[0]?.id ?? '',
    initialRule?.vehicleCategoryId ?? undefined,
  ));
  const [rows, setRows] = useState(() => makeInitialRows(
    initialRules,
    initialYearId,
    columns,
    initialRule?.vehicleCategoryId ?? undefined,
  ));
  const [formError, setFormError] = useState('');
  const allYearRules = initialRules.filter((rule) =>
    rule.scope === 'VEHICLE_TYPE'
    && rule.fiscalYearId === fiscalYearId,
  );
  const yearRules = allYearRules.filter((rule) =>
    !initialRule || rule.vehicleCategoryId === initialRule.vehicleCategoryId,
  );
  const yearFeeHeads = config.feeHeads.filter((feeHead) =>
    feeHead.fiscalYearId === fiscalYearId
    && (feeHead.status === 'ACTIVE' || yearRules.some((rule) => rule.feeHeadId === feeHead.id)),
  );
  const availableFeeHeads = yearFeeHeads;

  const changeFiscalYear = (nextFiscalYearId: string) => {
    const nextColumns = makeInitialColumns(
      config,
      initialRules,
      nextFiscalYearId,
      billingEntities[0]?.id ?? '',
      initialRule?.vehicleCategoryId ?? undefined,
    );
    setFiscalYearId(nextFiscalYearId);
    setColumns(nextColumns);
    setRows(makeInitialRows(initialRules, nextFiscalYearId, nextColumns, initialRule?.vehicleCategoryId ?? undefined));
    setMeetingDocument(null);
    setFormError('');
  };

  const updateColumn = (columnId: string, changes: Partial<FeeHeadColumn>) => {
    setColumns((current) => current.map((column) =>
      column.id === columnId ? { ...column, ...changes } : column,
    ));
  };

  const addColumn = () => {
    const selectedFeeHeadIds = new Set(columns.map((column) => column.feeHeadId).filter(Boolean));
    const nextFeeHead = availableFeeHeads.find((feeHead) => !selectedFeeHeadIds.has(feeHead.id));
    const existing = initialRule
      ? yearRules.find((rule) => rule.feeHeadId === nextFeeHead?.id)
      : undefined;
    const nextColumn = {
      ...makeColumn(nextFeeHead?.id ?? '', existing),
      billingEntityId: existing?.billingEntityId ?? billingEntities[0]?.id ?? '',
    };
    setColumns((current) => [...current, nextColumn]);
    setRows((current) => current.map((row) => ({
      ...row,
      amounts: { ...row.amounts, [nextColumn.id]: '' },
    })));
  };

  const removeColumn = (columnId: string) => {
    setColumns((current) => current.filter((column) => column.id !== columnId));
    setRows((current) => current.map((row) => {
      const amounts = { ...row.amounts };
      delete amounts[columnId];
      return { ...row, amounts };
    }));
  };

  const addRow = () => {
    setRows((current) => [...current, {
      id: crypto.randomUUID(),
      vehicleCategoryId: '',
      locked: false,
      amounts: Object.fromEntries(columns.map((column) => [column.id, ''])),
    }]);
  };

  const removeRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    if (!fiscalYearId) {
      setFormError('वित्तीय वर्ष चयन गर्नुहोस्।');
      return;
    }
    if (!effectiveDate) {
      setFormError('लागु मिति चयन गर्नुहोस्।');
      return;
    }
    const reference = meetingReference.trim();
    if (!reference) {
      setFormError('कुन मिटिङबाट पास भएको हो लेख्नुहोस्।');
      return;
    }
    if (meetingDocument) {
      setFormError('मिटिङ कागजात अपलोड सुविधा उपलब्ध नभएकाले फाइल सुरक्षित गर्न सकिँदैन। फाइल हटाएर फेरि प्रयास गर्नुहोस्।');
      return;
    }
    const selectedFeeHeadIds = columns.map((column) => column.feeHeadId);
    if (selectedFeeHeadIds.some((id) => !id)) {
      setFormError('प्रत्येक शुल्क स्तम्भका लागि शुल्क शीर्षक चयन गर्नुहोस् वा खाली स्तम्भ हटाउनुहोस्।');
      return;
    }
    if (new Set(selectedFeeHeadIds).size !== selectedFeeHeadIds.length) {
      setFormError('एउटै शुल्क शीर्षक एकभन्दा बढी स्तम्भमा चयन गर्न मिल्दैन।');
      return;
    }

    const selectedVehicleIds = rows.map((row) => row.vehicleCategoryId).filter(Boolean);
    if (selectedVehicleIds.length !== rows.length) {
      setFormError('प्रत्येक पङ्क्तिका लागि सवारी प्रकार चयन गर्नुहोस्।');
      return;
    }
    if (new Set(selectedVehicleIds).size !== selectedVehicleIds.length) {
      setFormError('एउटै सवारी प्रकार एकभन्दा बढी पङ्क्तिमा चयन गर्न मिल्दैन।');
      return;
    }

    const entries: VehicleRuleEntry[] = [];
    for (const row of rows) {
      for (const column of columns) {
        const feeHead = yearFeeHeads.find((item) => item.id === column.feeHeadId);
        if (!feeHead) {
          setFormError('चयन गरिएको शुल्क शीर्षक यो आर्थिक वर्षमा उपलब्ध छैन।');
          return;
        }
        const rawAmount = row.amounts[column.id] ?? '';
        if (!rawAmount.trim()) continue;
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount < 0) {
          setFormError(`${feeHead.name} को रकम शून्य वा त्यसभन्दा बढी हुनुपर्छ।`);
          return;
        }
        if (amount === 0) continue;

        const existing = allYearRules.find((rule) =>
          rule.feeHeadId === feeHead.id && rule.vehicleCategoryId === row.vehicleCategoryId,
        );
        const billingEntityId = column.billingEntityId || existing?.billingEntityId || '';
        if (!billingEntityId) {
          setFormError(`${feeHead.name} का लागि Billing Entity चयन गर्नुहोस्।`);
          return;
        }
        entries.push({
          feeHead,
          rule: {
            id: existing?.id ?? crypto.randomUUID(),
            feeHeadId: feeHead.id,
            fiscalYearId,
            billingEntityId,
            scope: 'VEHICLE_TYPE',
            vehicleCategoryId: row.vehicleCategoryId,
            frequency: column.frequency,
            period: column.period,
            validity: column.validity,
            amount,
            status: existing?.status ?? 'ACTIVE',
            effectiveDate,
            meetingReference: reference,
          },
        });
      }
    }
    if (entries.length === 0 && (!initialRule || yearRules.length === 0)) {
      setFormError('कम्तीमा एउटा सवारी प्रकार र शुल्क शीर्षकको रकम प्रविष्ट गर्नुहोस्।');
      return;
    }
    void onSubmit({
      fiscalYearId,
      effectiveDate,
      meetingReference: reference,
      ...(initialRule?.vehicleCategoryId ? { editingVehicleCategoryId: initialRule.vehicleCategoryId } : {}),
      entries,
    });
  };

  return (
    <form className="space-y-10" onSubmit={handleSubmit}>
      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div>
          <h3 className="text-base font-semibold">Vehicle Type Rule</h3>
          <p className="text-sm text-muted-foreground">यो नियम कुन सवारीमा लागू हुन्छ छान्नुहोस्।</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-rule-fiscal-year">वित्तीय वर्ष <span className="text-destructive">*</span></Label>
            <Select value={fiscalYearId} onValueChange={changeFiscalYear}>
              <SelectTrigger id="vehicle-rule-fiscal-year" aria-required="true">
                <SelectValue placeholder="वित्तीय वर्ष छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                {config.fiscalYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-rule-effective-date">लागु मिति <span className="text-destructive">*</span></Label>
            <NepaliDatePicker
              id="vehicle-rule-effective-date"
              value={dateInputValueToDate(effectiveDate)}
              onChange={(date) => setEffectiveDate(dateToInputValue(date))}
              placeholder="मिति छान्नुहोस्..."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-rule-meeting-reference">कुन मिटिङबाट पास <span className="text-destructive">*</span></Label>
            <Input
              id="vehicle-rule-meeting-reference"
              required
              value={meetingReference}
              onChange={(event) => setMeetingReference(event.target.value)}
              placeholder="उदाहरण: २०८२/०३/२१ को सञ्चालक समिति बैठक"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-rule-meeting-document">मिटिङ कागजात</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={meetingDocumentInputRef}
                id="vehicle-rule-meeting-document"
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
        </div>

        {billingEntitiesError ? (
          <p role="alert" className="text-xs text-destructive">
            Billing Entity लोड गर्न सकिएन: {billingEntitiesError}
            {onReloadBillingEntities ? (
              <Button type="button" variant="link" size="xs" className="ml-1 h-auto p-0" onClick={onReloadBillingEntities}>
                पुनः प्रयास
              </Button>
            ) : null}
          </p>
        ) : null}

        <div className="mt-10 mb-4 overflow-x-auto rounded-lg border border-border bg-muted/20">
          <Table className="min-w-max">
            <TableHeader >
              <TableRow>
                <TableHead className="min-w-12 align-middle">सि.नं.</TableHead>
                <TableHead className="min-w-48 align-middle">वाहन प्रकार</TableHead>
                {columns.map((column) => {
                  const available = availableFeeHeads.filter((feeHead) =>
                    !columns.some((item) => item.id !== column.id && item.feeHeadId === feeHead.id),
                  );
                  return (
                    <Fragment key={column.id}>
                      <TableHead className="min-w-64 align-top normal-case">
                        <div className="space-y-2 pt-1">
                        <Select
                          value={column.feeHeadId}
                          onValueChange={(feeHeadId) => {
                            const existing = initialRule
                              ? yearRules.find((rule) => rule.feeHeadId === feeHeadId)
                              : undefined;
                            const defaultColumn = makeColumn(feeHeadId, existing);
                            updateColumn(column.id, {
                              ...defaultColumn,
                              id: column.id,
                              billingEntityId: existing?.billingEntityId ?? billingEntities[0]?.id ?? '',
                            });
                          }}
                        >
                          <SelectTrigger aria-label="शुल्क शीर्षक छान्नुहोस्">
                            <SelectValue placeholder="शुल्क शीर्षक" />
                          </SelectTrigger>
                          <SelectContent>
                            {available.map((feeHead) => (
                              <SelectItem key={feeHead.id} value={feeHead.id}>{feeHead.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div>
                          <Select
                            value={column.billingEntityId || yearRules.find((rule) => rule.feeHeadId === column.feeHeadId)?.billingEntityId || ''}
                            onValueChange={(billingEntityId) => updateColumn(column.id, { billingEntityId })}
                            disabled={isLoadingBillingEntities || billingEntities.length === 0}
                          >
                            <SelectTrigger aria-label="Billing Entity छान्नुहोस्">
                              <SelectValue placeholder="Billing Entity" />
                            </SelectTrigger>
                            <SelectContent>
                              {billingEntities.map((entity) => (
                                <SelectItem key={entity.id} value={entity.id}>
                                  {entity.entity}{entity.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Select
                          value={column.frequency}
                          onValueChange={(frequency) => updateColumn(column.id, {
                            frequency: frequency as Frequency,
                            period: frequency === 'ONE_TIME' ? 'FISCAL_YEAR' : 'MONTH',
                          })}
                        >
                          <SelectTrigger aria-label="शुल्क आवृत्ति छान्नुहोस्">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ONE_TIME">एकपटक</SelectItem>
                            <SelectItem value="PERIODIC">आवधिक</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={column.validity}
                          onValueChange={(validity) => updateColumn(column.id, { validity: validity as Validity })}
                        >
                          <SelectTrigger aria-label="लागु हुने समय छान्नुहोस्">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {validityOptions.map((validity) => (
                              <SelectItem key={validity.value} value={validity.value}>{validity.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        </div>
                      </TableHead>
                      <TableHead className="w-12 min-w-12 px-2 align-middle">
                        <TableActionIconButton
                          aria-label="शुल्क शीर्षक स्तम्भ हटाउनुहोस्"
                          title="हटाउनुहोस्"
                          onClick={() => removeColumn(column.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </TableActionIconButton>
                      </TableHead>
                    </Fragment>
                  );
                })}
                <TableHead className="w-12 align-middle">
                  <TableActionIconButton
                    aria-label="शुल्क शीर्षक थप्नुहोस्"
                    title="शुल्क शीर्षक थप्नुहोस्"
                    onClick={addColumn}
                    disabled={availableFeeHeads.length === columns.filter((column) => column.feeHeadId).length}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </TableActionIconButton>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const selectedVehicleIds = new Set(rows.filter((item) => item.id !== row.id).map((item) => item.vehicleCategoryId));
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Select
                        value={row.vehicleCategoryId}
                        onValueChange={(vehicleCategoryId) => setRows((current) => current.map((item) =>
                          item.id === row.id ? { ...item, vehicleCategoryId } : item,
                        ))}
                      >
                        <SelectTrigger aria-label={`पङ्क्ति ${index + 1} सवारी प्रकार`}>
                          <SelectValue placeholder="सूचीबाट छान्नुहोस्" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id} disabled={selectedVehicleIds.has(category.id)}>
                              {category.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {columns.map((column) => (
                      <Fragment key={column.id}>
                        <TableCell>
                          <Input
                            aria-label={`${row.vehicleCategoryId || `पङ्क्ति ${index + 1}`} - रकम`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amounts[column.id] ?? ''}
                            onChange={(event) => setRows((current) => current.map((item) =>
                              item.id === row.id
                                ? { ...item, amounts: { ...item.amounts, [column.id]: event.target.value } }
                                : item,
                            ))}
                            className="min-w-36"
                          />
                        </TableCell>
                        <TableCell className="w-12 min-w-12 px-2" />
                      </Fragment>
                    ))}
                    <TableCell>
                      {!row.locked && (
                        <TableActionIconButton
                          aria-label={`पङ्क्ति ${index + 1} हटाउनुहोस्`}
                          title="पङ्क्ति हटाउनुहोस्"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </TableActionIconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell colSpan={columns.length * 2 + 3} className="text-right">
                  <TableActionIconButton
                    aria-label="सवारी प्रकार पङ्क्ति थप्नुहोस्"
                    title="सवारी प्रकार थप्नुहोस्"
                    onClick={addRow}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </TableActionIconButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
      </section>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          रद्द गर्नुहोस्
        </Button>
        <Button type="submit" disabled={isSaving || isLoadingBillingEntities}>
          {isSaving ? 'सुरक्षित हुँदैछ...' : initialRule ? 'अपडेट गर्नुहोस्' : 'सेभ गर्नुहोस्'}
        </Button>
      </div>
    </form>
  );
}
