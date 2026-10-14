'use client';

import { useEffect } from 'react';

import { atom, useAtom, useSetAtom } from 'jotai';

export type ToastVariant = 'default' | 'destructive';

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

const toastsAtom = atom<ToastItem[]>([]);
const MAX_TOASTS = 3;

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useToast() {
  const [toasts, setToasts] = useAtom(toastsAtom);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = (item: Omit<ToastItem, 'id'>) => {
    const id = generateId();
    const next: ToastItem = { id, durationMs: 4000, variant: 'default', ...item };
    setToasts((prev) => [...prev.slice(Math.max(0, prev.length - (MAX_TOASTS - 1))), next]);
    return id;
  };

  return { toasts, toast, dismiss };
}

export function useToastAutoDismiss() {
  const [toasts] = useAtom(toastsAtom);
  const setToasts = useSetAtom(toastsAtom);

  useEffect(() => {
    const timers = toasts.map((t) => {
      const duration = t.durationMs ?? 4000;
      return window.setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, duration);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [setToasts, toasts]);
}
