'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';

export function VehicleTypeAssignmentDialog({
  open,
  onOpenChange,
  source,
  vehicleType,
  categories,
  isSaving,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: VehicleTypeRecord | null;
  vehicleType: string | null;
  categories: VehicleTypeRecord[];
  isSaving: boolean;
  onMove: (targetCategoryId: string) => Promise<void>;
}) {
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const target = categories.find((category) => category.id === targetCategoryId) ?? null;
  const availableTargets = categories.filter((category) => category.id !== source?.id);
  const alreadyAssigned = Boolean(target?.vehicleTypes.includes(vehicleType ?? ''));
  const canMove = Boolean(target && !alreadyAssigned && !isSaving);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-xl p-4">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">सवारी प्रकार अर्को श्रेणीमा सार्नुहोस्</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900">
            {vehicleType}
            <span className="mt-0.5 block text-xs font-normal text-blue-700">हालको श्रेणी: {source?.category}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">नयाँ श्रेणी</label>
            <Select value={targetCategoryId} onValueChange={(value) => {
              setTargetCategoryId(value);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="श्रेणी छान्नुहोस्" />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableTargets.length === 0 && (
              <p className="text-xs text-muted-foreground">सार्नका लागि अर्को सवारी श्रेणी उपलब्ध छैन।</p>
            )}
          </div>

          {alreadyAssigned && (
            <p className="text-xs text-amber-700">यो सवारी प्रकार नयाँ श्रेणीमा पहिले नै छ।</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              रद्द गर्नुहोस्
            </Button>
            <Button
              type="button"
              onClick={() => target && void onMove(target.id)}
              loading={isSaving}
              disabled={!canMove}
            >
              श्रेणी सार्नुहोस्
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}