'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BillingRule, BillingRuleConfig, Scope } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

import { BillingRuleForm } from './BillingRuleForm';

export interface BillingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BillingRuleConfig;
  vehicleCategories: VehicleTypeRecord[];
  billingEntities: BillingEntityRecord[];
  isLoadingBillingEntities?: boolean;
  billingEntitiesError?: string | null;
  onReloadBillingEntities?: () => void;
  currentFiscalYearId?: string;
  currentScope?: Scope;
  initialRule?: BillingRule | null;
  isSaving?: boolean;
  onSubmit: (rule: BillingRule) => void | Promise<void>;
}

export function BillingRuleDialog({
  open,
  onOpenChange,
  config,
  vehicleCategories,
  billingEntities,
  isLoadingBillingEntities,
  billingEntitiesError,
  onReloadBillingEntities,
  currentFiscalYearId,
  currentScope,
  initialRule,
  isSaving = false,
  onSubmit,
}: BillingRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{initialRule ? 'बिलिङ नियम सम्पादन' : 'नयाँ बिलिङ नियम'}</DialogTitle>
          <DialogDescription>
            Common Rule को शुल्क, रकम, आवृत्ति र लागू हुने अवधि अद्यावधिक गर्नुहोस्।
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <BillingRuleForm
            key={initialRule?.id ?? 'new-billing-rule'}
            initialRule={initialRule}
            config={config}
            vehicleCategories={vehicleCategories}
            billingEntities={billingEntities}
            isLoadingBillingEntities={isLoadingBillingEntities}
            billingEntitiesError={billingEntitiesError}
            onReloadBillingEntities={onReloadBillingEntities}
            currentFiscalYearId={currentFiscalYearId}
            currentScope={currentScope}
            isSaving={isSaving}
            onCancel={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}