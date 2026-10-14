'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

import { useToast, useToastAutoDismiss } from './use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();
  useToastAutoDismiss();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[1700] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-in fade-in slide-in-from-top-2 rounded-lg border bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80',
            t.variant === 'destructive'
              ? 'border-destructive/40'
              : 'border-border',
          )}
          role="status"
          aria-atomic="true"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              {t.variant === 'destructive' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground/80" />
              )}
              <div className="min-w-0">
              <p className={cn('text-sm font-semibold', t.variant === 'destructive' && 'text-destructive')}>
                {t.title}
              </p>
              {t.description ? (
                <p
                  className={cn(
                    'mt-1 text-sm text-muted-foreground',
                    t.variant === 'destructive' && 'text-destructive/90',
                  )}
                >
                  {t.description}
                </p>
              ) : null}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Close"
              onClick={() => dismiss(t.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
