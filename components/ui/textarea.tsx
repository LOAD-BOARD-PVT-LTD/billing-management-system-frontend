import * as React from 'react';

import {
  createFontasyChangeEvent,
  hasFontasyHimaliInputClass,
  isNoFontasyField,
  useFontasyClassInput,
} from '@/utils/fontasy-himali';
import { cn } from '@/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const fontasyActive =
      value !== undefined &&
      onChange !== undefined &&
      hasFontasyHimaliInputClass(className) &&
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
          'flex min-h-[80px] w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={(node) => {
          fontasyInput.registerElement(node);
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onChange={handleChange}
        value={fontasyActive ? fontasyInput.displayValue : value}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
