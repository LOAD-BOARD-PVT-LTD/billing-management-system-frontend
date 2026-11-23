'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

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
      setFormError(error instanceof Error ? error.message : 'सवारी श्रेणी सुरक्षित गर्न सकिएन।');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label htmlFor="vehicle-category-name" className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              १
            </span>
            बिलिङ सवारी श्रेणीको नाम
          </label>
          <Input
            id="vehicle-category-name"
            value={form.category}
            onChange={(event) => {
              setForm((previous) => ({ ...previous, category: event.target.value }));
              setFormError(null);
            }}
            placeholder="उदाहरण: Heavy Truck, Mini Truck, Tipper"
            className="bg-card text-sm"
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            यो नाम बिलिङ नियम र रिपोर्टमा सवारी वर्गको रूपमा देखिन्छ।
          </p>
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
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border/80 bg-muted/20 px-5 py-3.5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          रद्द गर्नुहोस्
        </Button>
        <Button type="button" onClick={() => void handleSubmit()} loading={isSubmitting} className="min-w-[160px]">
          {mode === 'create' ? 'श्रेणी सुरक्षित गर्नुहोस्' : 'परिवर्तन सुरक्षित गर्नुहोस्'}
        </Button>
      </div>
    </div>
  );
}
