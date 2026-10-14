'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BillingEntityForm } from './BillingEntityForm';
import type { BillingEntityFields, BillingEntityRecord } from '../types/billing-entity.types';

const EMPTY_ENTITY: BillingEntityFields = {
  entity: '',
  registrationNumber: '',
  panNumber: '',
  contactPerson: '',
  email: '',
  phoneNumber: '',
  hotlineNumber: '',
  website: '',
  address: '',
  status: 'ACTIVE',
};

export function BillingEntityDialog({
  open,
  onOpenChange,
  record,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: BillingEntityRecord | null;
  isSaving: boolean;
  onSubmit: (fields: BillingEntityFields) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,calc(100dvh-2rem))] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>{record ? 'Edit billing entity' : 'Create billing entity'}</DialogTitle>
        </DialogHeader>
        <BillingEntityForm
          key={`${record?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
          initialValue={record ?? EMPTY_ENTITY}
          isSubmitting={isSaving}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
