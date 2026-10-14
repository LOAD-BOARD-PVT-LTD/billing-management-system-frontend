'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TqmsVehicleTypeSelector } from '@/features/vehicle/mappings/tqms-vehicle-type/components/TqmsVehicleTypeSelector';
import type { VehicleTypeDraft, VehicleTypeFormSubmission } from '@/features/vehicle/type/types/vehicle-type.types';
import { validateVehicleTypeForm } from '@/features/vehicle/type/schemas/vehicle-type.schema';

export function VehicleTypeForm({
  mode,
  initialValue,
  assignedTypeCategories,
  enabled,
  isSubmitting,
  onDirtyChange,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initialValue: VehicleTypeDraft;
  assignedTypeCategories: Record<string, string>;
  enabled: boolean;
  isSubmitting: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSubmit: (payload: VehicleTypeFormSubmission) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<VehicleTypeDraft>(() => initialValue);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const base = JSON.stringify(initialValue);
    const current = JSON.stringify(form);
    onDirtyChange(base !== current);
  }, [form, initialValue, onDirtyChange]);

  const handleSubmit = async () => {
    const validation = validateVehicleTypeForm(form);
    if (!validation.isValid) {
      setFormError(
        validation.errors.category ?? validation.errors.selectedTypeIds ?? 'कृपया सबै आवश्यक जानकारी भर्नुहोस्।',
      );
      return;
    }

    try {
      setFormError(null);
      await onSubmit({
        category: form.category.trim(),
        selectedTypeIds: form.selectedTypeIds,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save vehicle type');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-3">
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pb-3">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 shadow-sm">
          <label className="mb-1 block text-xs font-medium text-slate-700">सवारी श्रेणी</label>
          <Input
            value={form.category}
            onChange={(event) => {
              setForm((previous) => ({ ...previous, category: event.target.value }));
              setFormError(null);
            }}
            placeholder="जस्तै: Heavy Truck"
            className="border-slate-200 bg-slate-50 text-sm"
          />
          <p className="mt-1 text-[10px] text-slate-500">उदाहरण: Heavy Truck</p>
        </div>

        <TqmsVehicleTypeSelector
          enabled={enabled}
          selectedTypeIds={form.selectedTypeIds}
          assignedTypeCategories={assignedTypeCategories}
          selectionMode="multiple"
          onSelectionChange={(selectedTypeIds) => {
            setForm((previous) => ({ ...previous, selectedTypeIds }));
            setFormError(null);
          }}
        />

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
        )}
      </div>

      <div className="-mx-4 flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <Button type="button" variant="outline" onClick={onCancel} className="min-w-[120px]">
          रद्द गर्नुहोस्
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} loading={isSubmitting} className="min-w-[180px]">
          {mode === 'create' ? 'सवारी प्रकार सेभ' : 'परिवर्तन सेभ'}
        </Button>
      </div>
    </div>
  );
}
