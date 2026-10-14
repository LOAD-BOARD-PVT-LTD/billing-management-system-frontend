'use client';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BranchRecord } from '../types/branch.types';

export function BranchDetailsDialog({
  record,
  entities,
  open,
  onOpenChange,
}: {
  record: BranchRecord | null;
  entities: BillingEntityRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const linkedEntities = record?.billingEntityIds
    .map((id) => entities.find((entity) => entity.id === id)?.entity ?? `Entity #${id}`)
    ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>शाखाको विवरण</DialogTitle>
        </DialogHeader>
        {record && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{record.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">शाखा कोड: {record.code}</p>
              </div>
              <Badge variant={record.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {record.status === 'ACTIVE' ? 'सञ्चालित' : 'निष्क्रिय'}
              </Badge>
            </div>
            <dl className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">ठेगाना</dt><dd className="mt-1 text-sm">{record.address || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">सम्पर्क व्यक्ति</dt><dd className="mt-1 text-sm">{record.contactPerson || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">फोन नम्बर</dt><dd className="mt-1 text-sm">{record.phone || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">रसिद रकम परिवर्तन</dt><dd className="mt-1 text-sm">{record.allowManualReceiptAmountOverride ? 'अनुमति छ' : 'अनुमति छैन'}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">सम्बन्धित बिलिङ इकाइ</dt>
                <dd className="mt-1 text-sm">{linkedEntities.length ? linkedEntities.join(', ') : 'बिलिङ इकाइ जोडिएको छैन'}</dd>
              </div>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
