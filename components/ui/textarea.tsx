import * as React from 'react';

import {
  createFontasyChangeEvent,
  isNoFontasyField,
  useFontasyClassInput,
} from '@/utils/fontasy-himali';
import { cn } from '@/utils/cn';
import { useFontasyHimali } from '@/contexts/fontasy-himali-context';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, value, error, success, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const { enabled: fontasyEnabled } = useFontasyHimali();
    const fontasyActive =
      fontasyEnabled &&
      value !== undefined &&
      onChange !== undefined &&
      !isNoFontasyField((props as Record<string, unknown>)['data-no-fontasy']) &&
      !props.readOnly &&
      !props.disabled;

    const fontasyInput = useFontasyClassInput<HTMLTextAreaElement>(
      fontasyActive ? String(value ?? '') : '',
      fontasyActive
        ? (nextValue, sourceEvent) => {
            onChange(
              sourceEvent
                ? createFontasyChangeEvent(sourceEvent, nextValue)
                : ({ target: { value: nextValue } } as React.ChangeEvent<HTMLTextAreaElement>),
            );
          }
        : () => {},
      fontasyActive,
    );

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
      if (!fontasyActive) {
        onChange?.(event);
        return;
      }

      fontasyInput.handleChange({
        nextDisplayValue: event.target.value,
        selectionStart: event.target.selectionStart,
        selectionEnd: event.target.selectionEnd,
        sourceEvent: event,
      });
    };

    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150',
          error && 'border-destructive focus-visible:ring-destructive',
          success && 'border-success/60 focus-visible:ring-success',
          fontasyActive && 'font-fontasy-himali-tt-input',
          className,
        )}
        ref={(node) => {
          fontasyInput.registerElement(node);
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        aria-invalid={ariaInvalid ?? (error || undefined)}
        onChange={handleChange}
        value={fontasyActive ? fontasyInput.displayValue : value}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
