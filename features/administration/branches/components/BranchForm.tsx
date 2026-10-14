'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BillingEntityRecord } from '@/features/administration/billing-entities/types/billing-entity.types';
import type { BranchFields } from '../types/branch.types';

export function BranchForm({
  initialValue,
  entities,
  isSaving,
  onSubmit,
  onCancel,
}: {
  initialValue: BranchFields;
  entities: BillingEntityRecord[];
  isSaving: boolean;
  onSubmit: (fields: BranchFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initialValue);
  const [formError, setFormError] = useState<string | null>(null);
  const update = <K extends keyof BranchFields>(key: K, value: BranchFields[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('शाखाको नाम र कोड आवश्यक छ।');
      return;
    }
    try {
      await onSubmit(form);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save branch.');
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">शाखाको नाम *
            <Input value={form.name} required onChange={(event) => update('name', event.target.value)} placeholder="मुख्य शाखा" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">शाखा कोड *
            <Input value={form.code} required onChange={(event) => update('code', event.target.value)} placeholder="KTM01" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">फोन नम्बर
            <Input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="9841234567" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">सम्पर्क व्यक्ति / व्यवस्थापक
            <Input value={form.contactPerson} onChange={(event) => update('contactPerson', event.target.value)} placeholder="राम बहादुर" />
          </label>
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">ठेगाना
            <Input value={form.address} onChange={(event) => update('address', event.target.value)} placeholder="वडा नं. १, काठमाडौं" />
          </label>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">सम्बन्धित बिलिङ इकाइ</legend>
            {entities.length ? (
              <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                {entities.map((entity) => (
                  <label key={entity.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.billingEntityIds.includes(entity.id)}
                      onCheckedChange={(checked) => {
                        const selected = new Set(form.billingEntityIds);
                        if (checked === true) selected.add(entity.id);
                        else selected.delete(entity.id);
                        update('billingEntityIds', Array.from(selected));
                      }}
                    />
                    <span>{entity.entity}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                बिलिङ इकाइहरू लोड भएनन्। शाखा सिर्जना गरी पछि बिलिङ इकाइ जोड्न सक्नुहुन्छ।
              </p>
            )}
          </fieldset>
          <label className="space-y-1.5 text-sm font-medium">
            अवस्था
            <Select value={form.status} onValueChange={(value) => update('status', value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">सञ्चालित</SelectItem>
                <SelectItem value="INACTIVE">निष्क्रिय</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox
              checked={form.allowManualReceiptAmountOverride}
              onCheckedChange={(checked) => update('allowManualReceiptAmountOverride', checked === true)}
            />
            रसिद रकम म्यानुअल रूपमा परिवर्तन गर्न अनुमति
          </label>
        </div>
        {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>रद्द गर्नुहोस्</Button>
        <Button type="submit" loading={isSaving}>{initialValue.name ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'शाखा सिर्जना गर्नुहोस्'}</Button>
      </div>
    </form>
  );
}
