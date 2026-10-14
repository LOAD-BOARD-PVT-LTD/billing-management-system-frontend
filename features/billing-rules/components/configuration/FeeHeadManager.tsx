'use client';

import { Button } from '@/components/ui/button';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { useToast } from '@/components/ui/use-toast';
import type { FeeHead } from '@/features/billing-rules/model/types';
import type { BillingRule, FiscalYear } from '@/features/billing-rules/model/types';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { FeeHeadDialog } from '@/features/billing-rules/components/configuration/FeeHeadDialog';

interface FeeHeadManagerProps {
  feeHeads: FeeHead[];
  fiscalYears: FiscalYear[];
  rules: BillingRule[];
  onCreate: (feeHead: FeeHead) => Promise<unknown> | void;
  onUpdate: (feeHead: FeeHead) => Promise<unknown> | void;
}

export function FeeHeadManager({ feeHeads, fiscalYears, rules, onCreate, onUpdate }: FeeHeadManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeHead | null>(null);
  const [emptyValue] = useState<FeeHead>(() => ({ id: '', code: '', fiscalYearId: null, name: '', status: 'ACTIVE' }));
  const { toast } = useToast();
  const fiscalYearNames = new Map(fiscalYears.map((year) => [year.id, year.name]));

  return (
    <section className="space-y-2" aria-label="शुल्क शीर्षक">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">शुल्क शीर्षक <span className="font-normal text-muted-foreground">({feeHeads.length})</span></h2>
        <Button
          type="button"
          variant="outline"
          size="xs"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          थप्नुहोस्
        </Button>
      </div>
      {feeHeads.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">कुनै शुल्क शीर्षक छैन।</p>
      ) : (
        <ol className="inline-flex max-w-full flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {feeHeads.map((feeHead, index) => (
            <li key={feeHead.id} className="flex w-fit max-w-full items-center gap-2 px-2 py-0.5 text-xs">
              <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
              <span className="min-w-0 font-medium">
                {feeHead.name}
                <span className="ml-1 font-normal text-muted-foreground">
                  ({fiscalYearNames.get(feeHead.fiscalYearId ?? '') ?? 'तोकिएको छैन'})
                </span>
              </span>
              <TableActionIconButton
                className="h-7 w-7 shrink-0"
                aria-label={`${feeHead.name} सम्पादन गर्नुहोस्`}
                onClick={() => { setEditing(feeHead); setOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </TableActionIconButton>
            </li>
          ))}
        </ol>
      )}
      <FeeHeadDialog
        open={open}
        onOpenChange={setOpen}
        initialValue={editing ?? { ...emptyValue, fiscalYearId: fiscalYears.find((year) => year.status === 'ACTIVE')?.id ?? null }}
        fiscalYears={fiscalYears}
        fiscalYearLocked={Boolean(editing && rules.some((rule) => rule.feeHeadId === editing.id))}
        onSubmit={async (value) => {
          try {
            if (editing) await onUpdate(value);
            else await onCreate(value);
            setOpen(false);
            setEditing(null);
          } catch (error) {
            toast({
              title: 'शुल्क शीर्षक सुरक्षित हुन सकेन',
              description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
              variant: 'destructive',
            });
          }
        }}
      />
    </section>
  );
}
