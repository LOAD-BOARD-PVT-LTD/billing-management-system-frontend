'use client';

import { useMemo, useState } from 'react';
import { CarFront, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VehicleTypeForm } from '@/features/vehicle/type/components/VehicleTypeForm';
import type {
  VehicleTypeDraft,
  VehicleTypeFormSubmission,
  VehicleTypeRecord,
} from '@/features/vehicle/type/types/vehicle-type.types';

const EMPTY_DRAFT: VehicleTypeDraft = { category: '', selectedTypeIds: [] };

export function VehicleTypeDialog({
  open,
  onOpenChange,
  record,
  assignedTypeCategories,
  isSaving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  record: VehicleTypeRecord | null;
  assignedTypeCategories: Record<string, string>;
  isSaving: boolean;
  onSubmit: (payload: VehicleTypeFormSubmission) => Promise<void> | void;
}) {
  const [dirty, setDirty] = useState(false);
  const initialValue = useMemo<VehicleTypeDraft>(
    () => ({
      category: record?.category ?? '',
      selectedTypeIds: record?.vehicleTypes ?? [],
    }),
    [record],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDirty(false);
    }

    if (!nextOpen && dirty) {
      const shouldClose = window.confirm('तपाईंले गर्नुभएको परिवर्तनहरू बचत नगरिकन बाहिर निस्कनुहुन्छ?');
      if (!shouldClose) {
        return;
      }
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(84vh,calc(100dvh-2rem))] max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-lg [&>button]:hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/80 bg-muted/20 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CarFront className="h-4 w-4" aria-hidden="true" />
            </div>
            <DialogHeader className="gap-0.5 text-left">
              <DialogTitle className="text-base font-semibold text-foreground">
                {record ? 'सवारी श्रेणी सम्पादन गर्नुहोस्' : 'नयाँ सवारी श्रेणी थप्नुहोस्'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                श्रेणीको नाम लेख्नुहोस् र यसअन्तर्गत पर्ने TQMS सवारी प्रकारहरू छान्नुहोस्।
              </DialogDescription>
            </DialogHeader>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="बन्द गर्नुहोस्"
            className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <VehicleTypeForm
          key={`${record?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
          mode={record ? 'edit' : 'create'}
          initialValue={record ? initialValue : EMPTY_DRAFT}
          assignedTypeCategories={assignedTypeCategories}
          enabled={open}
          isSubmitting={isSaving}
          onDirtyChange={setDirty}
          onSubmit={onSubmit}
          onCancel={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
