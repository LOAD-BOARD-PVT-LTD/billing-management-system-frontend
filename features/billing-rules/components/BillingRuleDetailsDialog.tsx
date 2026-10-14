'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BillingRule, FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';

export interface BillingRuleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: BillingRule | null;
  feeHeads: FeeHead[];
  fiscalYears: FiscalYear[];
  billingEntities: BillingEntityRecord[];
  vehicleCategoryName?: string;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ne-NP', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatEffectiveDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ne-NP', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

export function BillingRuleDetailsDialog({
  open,
  onOpenChange,
  rule,
  feeHeads,
  fiscalYears,
  billingEntities,
  vehicleCategoryName,
}: BillingRuleDetailsDialogProps) {
  const feeHead = feeHeads.find((item) => item.id === rule?.feeHeadId);
  const fiscalYear = fiscalYears.find((item) => item.id === rule?.fiscalYearId);
  const billingEntity = billingEntities.find((item) => item.id === rule?.billingEntityId);
  const details = [
    ['नियम ID', rule?.id ?? '—'],
    ['शुल्क शीर्षक', feeHead?.name ?? rule?.feeHeadId ?? '—'],
    ['आर्थिक वर्ष', fiscalYear?.name ?? rule?.fiscalYearId ?? '—'],
    ['दायरा', rule?.scope === 'VEHICLE_TYPE' ? 'सवारी प्रकार' : 'साझा नियम'],
    ['सवारी श्रेणी', rule?.scope === 'COMMON' ? 'लागू हुँदैन' : vehicleCategoryName ?? rule?.vehicleCategoryId ?? '—'],
    ['लागु मिति', formatEffectiveDate(rule?.effectiveDate)],
    ['कुन मिटिङबाट पास', rule?.meetingReference ?? '—'],
    ['Billing Entity', billingEntity?.entity ?? '—'],
    ['शुल्क प्रकार', rule?.frequency === 'ONE_TIME' ? 'एकपटक' : 'आवधिक'],
    ['अवधि', rule?.period === null ? 'लागू हुँदैन' : rule?.period === 'MONTH' ? 'महिना' : rule?.period === 'FISCAL_YEAR' ? 'आर्थिक वर्ष' : '—'],
    ['मान्य अवधि अन्त्य', rule?.validity === 'END_OF_MONTH' ? 'महिनाको अन्त्य' : rule?.validity === 'END_OF_FISCAL_YEAR' ? 'आर्थिक वर्षको अन्त्य' : 'सोही दिन'],
    ['रकम', rule ? `Rs. ${rule.amount.toLocaleString('en-IN')}` : '—'],
    ['स्थिति', rule?.status === 'ACTIVE' ? 'सक्रिय' : 'निष्क्रिय'],
    ['सिर्जना मिति', formatDate(rule?.createdAt)],
    ['अन्तिम परिवर्तन', formatDate(rule?.updatedAt)],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>बिलिङ नियम विवरण</DialogTitle>
          <DialogDescription>यस नियममा सुरक्षित गरिएको सम्पूर्ण कन्फिगरेसन।</DialogDescription>
        </DialogHeader>
        {rule ? (
          <dl className="grid gap-0 divide-y divide-border/70 rounded-lg border border-border px-4">
            {details.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>बन्द गर्नुहोस्</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}