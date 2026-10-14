'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
      <DialogContent className="flex max-h-[min(78vh,calc(100dvh-2rem))] max-w-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/95 p-0 shadow-lg backdrop-blur-sm [&>button]:hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <span className="text-sm">🚗</span>
            </div>
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-lg font-semibold text-slate-800">
                {record ? 'Vehicle Category सम्पादन' : 'नयाँ Vehicle Category'}
              </DialogTitle>
            </DialogHeader>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-5 w-5" />
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
