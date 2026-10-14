'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/utils/cn';

type TableActionIconButtonProps = Omit<ButtonProps, 'variant' | 'size'> & {
  tone?: 'default' | 'destructive';
};

export function TableActionIconButton({
  className,
  tone = 'default',
  ...props
}: TableActionIconButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        'h-7 w-7 rounded-md border border-border/60 bg-background text-foreground shadow-xs transition-colors duration-200 hover:bg-muted hover:shadow-sm',
        tone === 'destructive' &&
          'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
        className,
      )}
      {...props}
    />
  );
}
