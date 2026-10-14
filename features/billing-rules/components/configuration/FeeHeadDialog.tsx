'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import { useEffect, useState } from 'react';

interface FeeHeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: FeeHead;
  fiscalYears: FiscalYear[];
  fiscalYearLocked?: boolean;
  onSubmit: (value: FeeHead) => Promise<void> | void;
}

export function FeeHeadDialog({ open, onOpenChange, initialValue, fiscalYears, fiscalYearLocked = false, onSubmit }: FeeHeadDialogProps) {
  const [value, setValue] = useState<FeeHead>(initialValue);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>शुल्क शीर्षक</DialogTitle>
          <DialogDescription>शुल्कको कोड, नाम र विवरण लेख्नुहोस्।</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fee-head-code">Code</Label>
            <Input id="fee-head-code" value={value.code ?? ''} onChange={(event) => setValue((current) => ({ ...current, code: event.target.value.toUpperCase() }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-head-name">Name</Label>
            <Input id="fee-head-name" value={value.name} onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-head-fiscal-year">आर्थिक वर्ष</Label>
            <Select
              value={value.fiscalYearId ?? '__unassigned__'}
              onValueChange={(fiscalYearId) => setValue((current) => ({ ...current, fiscalYearId: fiscalYearId === '__unassigned__' ? null : fiscalYearId }))}
              disabled={fiscalYearLocked}
            >
              <SelectTrigger id="fee-head-fiscal-year"><SelectValue placeholder="आर्थिक वर्ष छान्नुहोस्" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">आर्थिक वर्ष छान्नुहोस्</SelectItem>
                {fiscalYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}{year.status === 'INACTIVE' ? ' · निष्क्रिय' : ''}</SelectItem>)}
              </SelectContent>
            </Select>
            {fiscalYearLocked ? <p className="text-xs text-muted-foreground">बिलिङ नियमले प्रयोग गरेकाले यस शुल्क शीर्षकको आर्थिक वर्ष परिवर्तन गर्न मिल्दैन।</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!value.code?.trim() || !value.name.trim() || !value.fiscalYearId} onClick={() => void onSubmit({ ...value, id: value.id || crypto.randomUUID() })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
