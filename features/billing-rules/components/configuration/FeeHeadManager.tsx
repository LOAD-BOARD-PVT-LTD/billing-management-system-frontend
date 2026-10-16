'use client';

import { Button } from '@/components/ui/button';
import { TableActionIconButton } from '@/components/ui/table-action-icon-button';
import { useToast } from '@/components/ui/use-toast';
import type { FeeHead } from '@/features/billing-rules/model/types';
import type { BillingRule, FiscalYear } from '@/features/billing-rules/model/types';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
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
  const [deactivating, setDeactivating] = useState<FeeHead | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
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
        <ol className="flex max-w-full flex-row flex-wrap gap-2">
          {feeHeads.map((feeHead, index) => (
            <li key={feeHead.id} className="flex max-w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
              <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
              <span className="min-w-0 font-medium">
                {feeHead.name}
                <span className="ml-1 font-normal text-muted-foreground">
                  ({fiscalYearNames.get(feeHead.fiscalYearId ?? '') ?? 'तोकिएको छैन'})
                </span>
                {feeHead.status === 'INACTIVE' ? (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-normal text-muted-foreground">निष्क्रिय</span>
                ) : null}
              </span>
              <TableActionIconButton
                className="h-7 w-7 shrink-0"
                aria-label={`${feeHead.name} सम्पादन गर्नुहोस्`}
                onClick={() => { setEditing(feeHead); setOpen(true); }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </TableActionIconButton>
              <TableActionIconButton
                className="h-7 w-7 shrink-0"
                tone={feeHead.status === 'ACTIVE' ? 'destructive' : 'default'}
                aria-label={feeHead.status === 'ACTIVE' ? `${feeHead.name} निष्क्रिय गर्नुहोस्` : `${feeHead.name} पुनः सक्रिय गर्नुहोस्`}
                title={feeHead.status === 'ACTIVE' ? 'निष्क्रिय गर्नुहोस्' : 'पुनः सक्रिय गर्नुहोस्'}
                onClick={() => {
                  if (feeHead.status === 'ACTIVE') {
                    setDeactivating(feeHead);
                    return;
                  }
                  void (async () => {
                    try {
                      await onUpdate({ ...feeHead, status: 'ACTIVE' });
                      toast({ title: 'शुल्क शीर्षक पुनः सक्रिय भयो', description: `${feeHead.name} फेरि प्रयोग गर्न सकिन्छ।` });
                    } catch (error) {
                      toast({
                        title: 'शुल्क शीर्षक सक्रिय गर्न सकिएन',
                        description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
                        variant: 'destructive',
                      });
                    }
                  })();
                }}
              >
                {feeHead.status === 'ACTIVE'
                  ? <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  : <Power className="h-3.5 w-3.5" aria-hidden="true" />}
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
      <ConfirmDialog
        open={Boolean(deactivating)}
        onOpenChange={(nextOpen) => { if (!nextOpen) setDeactivating(null); }}
        title="शुल्क शीर्षक निष्क्रिय गर्ने?"
        description="यो शुल्क शीर्षक नयाँ बिलिङका लागि उपलब्ध हुने छैन। यससँग जोडिएका नियम र पुराना बिलिङ अभिलेख सुरक्षित रहनेछन्।"
        confirmLabel="निष्क्रिय गर्नुहोस्"
        confirmVariant="destructive"
        isLoading={isChangingStatus}
        onConfirm={async () => {
          if (!deactivating) return;
          setIsChangingStatus(true);
          try {
            await onUpdate({ ...deactivating, status: 'INACTIVE' });
            toast({ title: 'शुल्क शीर्षक निष्क्रिय भयो', description: `${deactivating.name} नयाँ बिलिङका लागि उपलब्ध हुनेछैन।` });
            setDeactivating(null);
          } finally {
            setIsChangingStatus(false);
          }
        }}
        onError={(error) => toast({
          title: 'शुल्क शीर्षक निष्क्रिय गर्न सकिएन',
          description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।',
          variant: 'destructive',
        })}
      />
    </section>
  );
}
