'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BranchFields, BranchRecord } from '../types/branch.types';
import { BranchForm } from './BranchForm';

const EMPTY_BRANCH: BranchFields = {
  name: '',
  code: '',
  address: '',
  phone: '',
  contactPerson: '',
  billingEntityIds: [],
  allowManualReceiptAmountOverride: false,
  status: 'ACTIVE',
};

export function BranchDialog({
  open,
  onOpenChange,
  record,
  entities,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: BranchRecord | null;
  entities: BillingEntityRecord[];
  isSaving: boolean;
  onSubmit: (fields: BranchFields) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,calc(100dvh-2rem))] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>{record ? 'शाखा सम्पादन' : 'नयाँ शाखा थप्नुहोस्'}</DialogTitle>
          <p className="text-sm text-muted-foreground">शाखाको विवरण र बिलिङ इकाइ पहुँच व्यवस्थापन गर्नुहोस्।</p>
        </DialogHeader>
        <BranchForm
          key={`${record?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
          initialValue={record ?? EMPTY_BRANCH}
          entities={entities}
          isSaving={isSaving}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
