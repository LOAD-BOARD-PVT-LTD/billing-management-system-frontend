'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import { findDuplicateFeeHead } from '@/features/billing-rules/utils/fee-head-name-validation';

interface FeeHeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue: FeeHead;
  existingFeeHeads?: FeeHead[];
  fiscalYears: FiscalYear[];
  fiscalYearLocked?: boolean;
  isSaving?: boolean;
  onSubmit: (value: FeeHead) => Promise<void> | void;
}

export function FeeHeadDialog({
  open,
  onOpenChange,
  initialValue,
  existingFeeHeads = [],
  fiscalYears,
  fiscalYearLocked = false,
  isSaving = false,
  onSubmit,
}: FeeHeadDialogProps) {
  const [value, setValue] = useState<FeeHead>(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    isSubmittingRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(initialValue);
  }, [open, initialValue]);

  const busy = isSaving || isSubmitting;

  const duplicateFeeHead = useMemo(() => (
    findDuplicateFeeHead(existingFeeHeads, {
      id: value.id,
      name: value.name,
      fiscalYearId: value.fiscalYearId,
    })
  ), [existingFeeHeads, value.fiscalYearId, value.id, value.name]);

  const duplicateError = duplicateFeeHead
    ? `"${value.name.trim()}" नामको शुल्क शीर्षक यो आर्थिक वर्षमा पहिले नै छ।`
    : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = value.name.trim();
    if (isSubmittingRef.current || busy || !trimmedName || !value.fiscalYearId || duplicateFeeHead) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...value,
        name: trimmedName,
        id: value.id || crypto.randomUUID(),
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && busy) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>शुल्क शीर्षक</DialogTitle>
          <DialogDescription>शुल्क शीर्षकको नाम र विवरण लेख्नुहोस्।</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="fee-head-name">Name</Label>
            <Input
              id="fee-head-name"
              value={value.name}
              disabled={busy}
              aria-invalid={Boolean(duplicateError)}
              onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))}
            />
            {duplicateError ? (
              <p role="alert" className="text-xs text-destructive">
                {duplicateError}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee-head-fiscal-year">आर्थिक वर्ष</Label>
            <Select
              value={value.fiscalYearId ?? '__unassigned__'}
              onValueChange={(fiscalYearId) => setValue((current) => ({ ...current, fiscalYearId: fiscalYearId === '__unassigned__' ? null : fiscalYearId }))}
              disabled={fiscalYearLocked || busy}
            >
              <SelectTrigger id="fee-head-fiscal-year"><SelectValue placeholder="आर्थिक वर्ष छान्नुहोस्" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">आर्थिक वर्ष छान्नुहोस्</SelectItem>
                {fiscalYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {fiscalYearLocked ? <p className="text-xs text-muted-foreground">बिलिङ नियमले प्रयोग गरेकाले यस शुल्क शीर्षकको आर्थिक वर्ष परिवर्तन गर्न मिल्दैन।</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !value.name.trim() || !value.fiscalYearId || Boolean(duplicateFeeHead)}>
              {busy ? 'सुरक्षित हुँदैछ...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
