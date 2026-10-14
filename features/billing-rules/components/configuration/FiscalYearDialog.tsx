'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import { useEffect, useState } from 'react';

interface FiscalYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: FiscalYear;
  onSubmit: (value: FiscalYear) => Promise<void> | void;
}

export function FiscalYearDialog({ open, onOpenChange, initialValue, onSubmit }: FiscalYearDialogProps) {
  const [value, setValue] = useState<FiscalYear>(initialValue);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>आर्थिक वर्ष</DialogTitle>
          <DialogDescription>आर्थिक वर्षको कोड, नाम र अवधि लेख्नुहोस्।</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fiscal-year-code">Code</Label>
            <Input id="fiscal-year-code" value={value.code ?? ''} onChange={(event) => setValue((current) => ({ ...current, code: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscal-year-name">Name</Label>
            <Input id="fiscal-year-name" value={value.name} onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscal-year-start">Start Date</Label>
              <Input id="fiscal-year-start" type="date" value={value.startDate} onChange={(event) => setValue((current) => ({ ...current, startDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscal-year-end">End Date</Label>
              <Input id="fiscal-year-end" type="date" value={value.endDate} onChange={(event) => setValue((current) => ({ ...current, endDate: event.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!value.name.trim() || !value.startDate || !value.endDate || value.startDate > value.endDate} onClick={() => void onSubmit({ ...value, id: value.id || crypto.randomUUID() })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
