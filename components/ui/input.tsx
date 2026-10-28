import * as React from 'react';

import {
  createFontasyChangeEvent,
  isFontasyCompatibleInputType,
  isNoFontasyField,
  useFontasyClassInput,
} from '@/utils/fontasy-himali';
import { cn } from '@/utils/cn';
import { useFontasyHimali } from '@/contexts/fontasy-himali-context';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  selectOnFocus?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, onFocus, onKeyDown, onPaste, onChange, value, selectOnFocus, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const { enabled: fontasyEnabled } = useFontasyHimali();
    const fontasyActive =
      fontasyEnabled &&
      value !== undefined &&
      onChange !== undefined &&
      !isNoFontasyField((props as Record<string, unknown>)['data-no-fontasy']) &&
      isFontasyCompatibleInputType(type) &&
      !props.readOnly &&
      !props.disabled;

    const fontasyInput = useFontasyClassInput<HTMLInputElement>(
      fontasyActive ? String(value ?? '') : '',
      fontasyActive
        ? (nextValue, sourceEvent) => {
            onChange(
              sourceEvent
                ? createFontasyChangeEvent(sourceEvent, nextValue)
                : ({ target: { value: nextValue } } as React.ChangeEvent<HTMLInputElement>),
            );
          }
        : () => {},
      fontasyActive,
    );

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (type === 'number' && ['e', 'E', '+', '-'].includes(event.key)) {
        event.preventDefault();
      }
      onKeyDown?.(event);
    };

    const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (event) => {
      if (type === 'number') {
        const pastedText = event.clipboardData.getData('text');
        if (/[eE+-]/.test(pastedText)) {
          event.preventDefault();
          return;
        }
      }
      onPaste?.(event);
    };

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (event) => {
      if (selectOnFocus) {
        const input = event.currentTarget;
        window.setTimeout(() => {
          try {
            input.select();
          } catch {
                                                             
          }
        }, 0);
      }
      onFocus?.(event);
    };

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
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
      <input
        type={type}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={handleChange}
        value={fontasyActive ? fontasyInput.displayValue : value}
        className={cn(
          'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150',
          error && 'border-destructive focus-visible:ring-destructive',
          success && 'border-success/60 focus-visible:ring-success/20',
          fontasyActive && 'font-fontasy-himali-tt-input',
          className
        )}
        ref={(node) => {
          fontasyInput.registerElement(node);
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        aria-invalid={ariaInvalid ?? (error || undefined)}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
