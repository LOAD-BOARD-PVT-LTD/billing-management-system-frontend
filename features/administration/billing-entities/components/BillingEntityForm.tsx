'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { validateBillingEntity } from '../schemas/billing-entity.schema';
import type { BillingEntityFields } from '../types/billing-entity.types';

const fields: { key: keyof Omit<BillingEntityFields, 'status'>; label: string; required?: boolean }[] = [
  { key: 'entity', label: 'Entity name', required: true },
  { key: 'registrationNumber', label: 'Registration Number', required: true },
  { key: 'panNumber', label: 'PAN number', required: true },
  { key: 'contactPerson', label: 'Contact Person', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phoneNumber', label: 'Phone Number', required: true },
  { key: 'hotlineNumber', label: 'Hotline Number' },
  { key: 'website', label: 'Website' },
];

export function BillingEntityForm({
  initialValue,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  initialValue: BillingEntityFields;
  isSubmitting: boolean;
  onSubmit: (fields: BillingEntityFields) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initialValue);
  const [formError, setFormError] = useState<string | null>(null);

  const update = <K extends keyof BillingEntityFields>(key: K, value: BillingEntityFields[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateBillingEntity(form);
    if (error) {
      setFormError(error);
      return;
    }

    try {
      await onSubmit({
        ...form,
        entity: form.entity.trim(),
        registrationNumber: form.registrationNumber.trim(),
        panNumber: form.panNumber.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        hotlineNumber: form.hotlineNumber.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save billing entity.');
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(({ key, label, required }) => (
            <label key={key} className="space-y-1.5 text-sm font-medium text-foreground">
              <span>{label}{required ? ' *' : ''}</span>
              <Input
                type={key === 'email' ? 'email' : 'text'}
                value={form[key]}
                required={required}
                onChange={(event) => update(key, event.target.value)}
                placeholder={label}
              />
            </label>
          ))}
          <label className="space-y-1.5 text-sm font-medium text-foreground">
            <span>Status</span>
            <Select
              value={form.status}
              onValueChange={(value) => update('status', value === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-foreground sm:col-span-2">
            <span>Address *</span>
            <Textarea
              value={form.address}
              required
              onChange={(event) => update('address', event.target.value)}
              placeholder="Address"
              rows={3}
            />
          </label>
        </div>
        {formError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{initialValue.entity ? 'Save changes' : 'Create entity'}</Button>
      </div>
    </form>
  );
}
