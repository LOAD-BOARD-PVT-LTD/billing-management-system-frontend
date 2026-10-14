'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';

import { fontasyFromUnicode } from './fromUnicode';
import { fontasyToUnicode } from './toUnicode';

type FontasyInputElement = HTMLInputElement | HTMLTextAreaElement;

export function useFontasyClassInput<T extends FontasyInputElement>(
  unicodeValue: string,
  onUnicodeChange: (value: string, sourceEvent?: ChangeEvent<T>) => void,
  enabled: boolean,
) {
  const [editState, setEditState] = useState<{ unicode: string; display: string } | null>(null);
  const elementRef = useRef<T | null>(null);
  const pendingSelectionRef = useRef<{ start: number | null; end: number | null } | null>(null);

  const displayValue = enabled
    ? editState !== null && editState.unicode === unicodeValue
      ? editState.display
      : fontasyFromUnicode(unicodeValue)
    : unicodeValue;

  useLayoutEffect(() => {
    if (!enabled || !elementRef.current || !pendingSelectionRef.current) return;

    const { start, end } = pendingSelectionRef.current;
    if (start !== null && end !== null) {
      elementRef.current.setSelectionRange(start, end);
    }
    pendingSelectionRef.current = null;
  }, [displayValue, enabled]);

  const registerElement = useCallback((element: T | null) => {
    elementRef.current = element;
  }, []);

  const handleChange = useCallback(
    (params: {
      nextDisplayValue: string;
      selectionStart: number | null;
      selectionEnd: number | null;
      sourceEvent?: ChangeEvent<T>;
    }) => {
      const { nextDisplayValue, selectionStart, selectionEnd, sourceEvent } = params;

      if (!enabled) {
        onUnicodeChange(nextDisplayValue, sourceEvent);
        return;
      }

      const containsUnicode = /[\u0900-\u097F]/u.test(nextDisplayValue);
      const nextDisplayBuffer = nextDisplayValue;
      const nextUnicodeValue = containsUnicode ? nextDisplayValue : fontasyToUnicode(nextDisplayBuffer);

      setEditState({ unicode: nextUnicodeValue, display: nextDisplayBuffer });
      pendingSelectionRef.current = {
        start: selectionStart,
        end: selectionEnd,
      };
      onUnicodeChange(nextUnicodeValue, sourceEvent);
    },
    [enabled, onUnicodeChange],
  );

  return {
    displayValue,
    handleChange,
    registerElement,
  };
}
