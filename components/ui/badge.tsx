import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border-border text-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        caution: 'border-transparent bg-warning text-warning-foreground',
        info: 'border-transparent bg-info text-info-foreground',
        active: 'border-transparent bg-success text-success-foreground',
        inactive: 'border-transparent bg-muted text-muted-foreground',
        pending: 'border-transparent bg-warning text-warning-foreground',
        error: 'border-transparent bg-destructive text-destructive-foreground',
      },
      pulse: {
        true: 'animate-pulse motion-reduce:animate-none',
        false: '',
      },
      glow: {
        true: 'shadow-md shadow-warning/20',
        false: '',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[0.625rem]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      pulse: false,
      glow: false,
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showIcon?: boolean;
  icon?: React.ReactNode;
  pulse?: boolean;
  glow?: boolean;
}

const variantIcons: Record<string, React.ComponentType<{ className?: string }> | undefined> = {
  active: CheckCircle2,
  success: CheckCircle2,
  inactive: XCircle,
  error: XCircle,
  destructive: XCircle,
  pending: Clock,
  warning: AlertCircle,
  caution: AlertCircle,
  info: AlertCircle,
  default: undefined,
  secondary: undefined,
  outline: undefined,
};

function Badge({
  className,
  variant = 'default',
  showIcon = false,
  icon,
  pulse = false,
  glow = false,
  size,
  children,
  ...props
}: BadgeProps) {
  const IconComponent = showIcon && !icon ? variantIcons[variant ?? 'default'] : undefined;

  return (
    <div
      className={cn(
        badgeVariants({ variant, pulse, glow, size }),
        className,
      )}
      data-badge={variant}
      data-glow={glow ? 'true' : 'false'}
      {...props}
    >
      {IconComponent && <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };
