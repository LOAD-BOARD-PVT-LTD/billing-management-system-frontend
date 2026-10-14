'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FiscalYearDialog } from '@/features/billing-rules/components/configuration/FiscalYearDialog';
import type { BillingRule, FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import { Check, Star } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface FiscalYearManagerProps {
  fiscalYears: FiscalYear[];
  feeHeads: FeeHead[];
  rules: BillingRule[];
  onCreate: (year: FiscalYear) => Promise<unknown> | void;
  onUpdate: (year: FiscalYear) => Promise<unknown> | void;
  onDelete: (id: string) => Promise<unknown> | void;
  onSetDefault?: (year: FiscalYear) => Promise<unknown> | void;
  isSaving?: boolean;
}

export function FiscalYearManager({ fiscalYears, feeHeads, rules, onCreate, onUpdate, onDelete, onSetDefault, isSaving = false }: FiscalYearManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalYear | null>(null);
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      const year = fiscalYears.find((item) => item.id === id);
      toast({ title: 'आर्थिक वर्ष निष्क्रिय गरियो', description: year?.name });
    } catch (error) {
      toast({ title: 'आर्थिक वर्ष परिवर्तन हुन सकेन', description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।', variant: 'destructive' });
    }
  };

  const handleActivate = async (year: FiscalYear) => {
    try {
      await onUpdate({ ...year, status: 'ACTIVE' });
      toast({ title: 'आर्थिक वर्ष सक्रिय गरियो', description: year.name });
    } catch (error) {
      toast({ title: 'आर्थिक वर्ष सक्रिय हुन सकेन', description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।', variant: 'destructive' });
    }
  };

  const handleSetDefault = async (year: FiscalYear) => {
    if (!onSetDefault) return;
    try {
      await onSetDefault(year);
      toast({ title: 'पूर्वनिर्धारित आर्थिक वर्ष परिवर्तन भयो', description: year.name });
    } catch (error) {
      toast({ title: 'पूर्वनिर्धारित आर्थिक वर्ष परिवर्तन हुन सकेन', description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>आर्थिक वर्ष</CardTitle>
          <CardDescription>फ्रन्टएन्ड कन्फिगरेसनमा आर्थिक वर्ष व्यवस्थापन गर्नुहोस्।</CardDescription>
        </div>
        <Button type="button" variant="default" disabled={isSaving} onClick={() => { setEditing(null); setOpen(true); }}>
          + थप्नुहोस्
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fiscalYears.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            कुनै आर्थिक वर्ष छैन।
          </div>
        ) : (
          fiscalYears.map((year) => {
            const isReferenced = rules.some((rule) => rule.fiscalYearId === year.id)
              || feeHeads.some((feeHead) => feeHead.fiscalYearId === year.id);
            return (
            <div key={year.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <div className="flex items-center gap-2 font-medium">{year.name}{year.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"><Check className="h-3 w-3" />पूर्वनिर्धारित</span> : null}</div>
                <div className="text-xs text-muted-foreground">{year.startDate} → {year.endDate}{year.code ? ` · ${year.code}` : ''}{isReferenced ? ' · प्रयोगमा' : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => { setEditing(year); setOpen(true); }}>
                  Edit
                </Button>
                {onSetDefault && !year.isDefault ? <Button type="button" variant="ghost" size="sm" disabled={isSaving || year.status !== 'ACTIVE'} onClick={() => void handleSetDefault(year)}><Star className="mr-1 h-3.5 w-3.5" />हाल बनाउनुहोस्</Button> : null}
                <Button type="button" variant={year.status === 'ACTIVE' ? 'outline' : 'default'} size="sm" disabled={isSaving} onClick={() => year.status === 'ACTIVE' ? void handleDelete(year.id) : void handleActivate(year)}>
                  {year.status === 'ACTIVE' ? 'निष्क्रिय' : 'सक्रिय'}
                </Button>
              </div>
            </div>
          );})
        )}
      </CardContent>
      <FiscalYearDialog
        open={open}
        onOpenChange={setOpen}
        initialValue={editing ?? {
          id: crypto.randomUUID(),
          name: '',
          startDate: '',
          endDate: '',
          status: 'ACTIVE',
        }}
        onSubmit={async (value) => {
          try {
            if (editing) await onUpdate(value);
            else await onCreate(value);
            toast({ title: editing ? 'आर्थिक वर्ष परिवर्तन सुरक्षित भयो' : 'आर्थिक वर्ष थपियो', description: value.name });
            setOpen(false);
            setEditing(null);
          } catch (error) {
            toast({ title: 'आर्थिक वर्ष सुरक्षित हुन सकेन', description: error instanceof Error ? error.message : 'कृपया फेरि प्रयास गर्नुहोस्।', variant: 'destructive' });
          }
        }}
      />
    </Card>
  );
}
