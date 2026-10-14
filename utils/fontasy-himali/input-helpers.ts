import type React from 'react';

type FontasyInputElement = HTMLInputElement | HTMLTextAreaElement;

export const FONTASY_HIMALI_INPUT_CLASS = 'font-fontasy-himali-tt-input';

export function hasFontasyHimaliInputClass(className: unknown): boolean {
  return typeof className === 'string' && className.split(/\s+/).includes(FONTASY_HIMALI_INPUT_CLASS);
}

export function isFontasyCompatibleInputType(type?: string): boolean {
  return type === undefined || type === '' || type === 'text' || type === 'search';
}

export function isNoFontasyField(value: unknown): boolean {
  return value === true || value === 'true';
}

function createValueProxy<T extends FontasyInputElement>(element: T, value: string): T {
  return new Proxy(element, {
    get(target, prop, receiver) {
      if (prop === 'value') return value;
      const result = Reflect.get(target, prop, receiver);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  }) as T;
}

export function createFontasyChangeEvent<T extends FontasyInputElement>(
  baseEvent: React.ChangeEvent<T>,
  nextValue: string,
): React.ChangeEvent<T> {
  const proxiedElement = createValueProxy(baseEvent.currentTarget, nextValue);

  return new Proxy(baseEvent, {
    get(target, prop, receiver) {
      if (prop === 'target' || prop === 'currentTarget') return proxiedElement;
      const result = Reflect.get(target, prop, receiver);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  }) as React.ChangeEvent<T>;
}
