'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { toNepaliDigits } from '@/utils/numbers';
import { NepaliCalendar } from '@/components/ui/nepali-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/utils/cn';
import { formatBikramSambatDate } from '@/utils/nepali-calender-dates/nepali-date';

interface NepaliDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  showNepaliCalendar?: boolean;
  fromDate?: Date;
  toDate?: Date;
  disabled?: (date: Date) => boolean;
  isDisabled?: boolean;
  id?: string;
  required?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

function formatBsDisplayDate(date: Date): string {
  const bs = formatBikramSambatDate(date).replace(/-/g, '/');
  return toNepaliDigits(bs);
}

export function NepaliDatePicker({
  value,
  onChange,
  placeholder = 'मिति छान्नुहोस्...',
  className,
  showNepaliCalendar = true,
  fromDate,
  toDate,
  disabled,
  isDisabled,
  id,
  required,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: NepaliDatePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const selectedDate = value;

  const handleDateSelect = (date: Date | undefined) => {
    onChange?.(date);
    setIsPopoverOpen(false);
  };

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(next) => {
        if (isDisabled) return;
        setIsPopoverOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-required={required}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          variant="outline"
          disabled={isDisabled}
          className={cn(
            'h-10 w-full rounded-lg justify-start px-3 py-2 text-left text-sm font-normal',
            '!border-border !bg-background text-foreground',
            'hover:!border-border hover:!bg-card',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {selectedDate ? (
            <span className={showNepaliCalendar ? undefined : 'leading-none'}>
              {formatBsDisplayDate(selectedDate)}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-1rem))] p-0 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-auto"
        align="start"
        side="bottom"
        collisionPadding={12}
      >
        <NepaliCalendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          fromDate={fromDate}
          toDate={toDate}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}
