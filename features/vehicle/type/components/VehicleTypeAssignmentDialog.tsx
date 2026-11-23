'use client';

import { useState } from 'react';
import { ArrowRight, ArrowRightLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="max-w-[440px] rounded-2xl border border-border bg-card p-5 shadow-lg">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">TQMS प्रकार अर्को श्रेणीमा सार्नुहोस्</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                चयन गरिएको सवारी प्रकारलाई हालको श्रेणीबाट हटाएर नयाँ श्रेणीमा जोडिन्छ।
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-semibold text-foreground">{vehicleType}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="rounded-md bg-card px-2 py-0.5 font-medium text-foreground ring-1 ring-border">
                {source?.category}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="rounded-md bg-card px-2 py-0.5 font-medium text-primary ring-1 ring-primary/30">
                {target ? target.category : 'नयाँ श्रेणी छान्नुहोस्'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="target-vehicle-category" className="text-xs font-semibold text-foreground">
              नयाँ सवारी श्रेणी
            </label>
            <Select value={targetCategoryId} onValueChange={setTargetCategoryId}>
              <SelectTrigger id="target-vehicle-category">
                <SelectValue placeholder="लक्ष्य श्रेणी छान्नुहोस्" />
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
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              यो सवारी प्रकार चयन गरिएको श्रेणीमा पहिले नै छ।
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-border/80 pt-3">
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
