import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

import { cn } from '@/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary-hover hover:shadow-sm',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md',
        outline: 'text-foreground border-border hover:bg-accent hover:text-accent-foreground',
        success:
          'border-transparent bg-success text-success-foreground shadow-md hover:bg-success/90 hover:shadow-lg',
        warning:
          'border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md',
        caution:
          'border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md',
        info:
          'border-transparent bg-info text-info-foreground shadow-sm hover:bg-info/90 hover:shadow-md',
                                                                
        active:
          'border-transparent bg-success text-success-foreground shadow-md hover:bg-success/90',
        inactive:
          'border-transparent bg-muted text-muted-foreground shadow-xs hover:bg-muted/80',
        pending:
          'border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md',
        error:
          'border-transparent bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg',
      },
      pulse: {
        true: 'animate-pulse',
        false: '',
      },
      glow: {
        true: 'shadow-lg shadow-warning/50',
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
  pulse: pulseProp,
  glow: glowProp,
  size,
  children,
  ...props
}: BadgeProps) {
  const shouldReduceMotion = useReducedMotion();
  
                                                                                       
  const isPending = variant === 'pending' || variant === 'warning';
  const shouldPulse = pulseProp ?? (isPending && !shouldReduceMotion);
  const shouldGlow = glowProp ?? (isPending && !shouldReduceMotion);
  
                       
  const IconComponent = showIcon && !icon ? variantIcons[variant || 'default'] : undefined;
  const customIcon = icon;

  return (
    <div
      className={cn(
        badgeVariants({ variant, pulse: shouldPulse, glow: shouldGlow, size }),
                                                   
        isPending && !shouldReduceMotion && 'relative overflow-hidden',
        className
      )}
      role="status"
      aria-live="polite"
      data-badge={variant}
      data-glow={shouldGlow ? 'true' : 'false'}
      {...props}
    >
      {                                     }
      {isPending && !shouldReduceMotion && (
        <span
          className="absolute inset-0 rounded-lg bg-warning/20 animate-pulse"
          aria-hidden="true"
        />
      )}
      
      {          }
      {IconComponent && (
        <IconComponent className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {customIcon && <span className="shrink-0" aria-hidden="true">{customIcon}</span>}
      
      {             }
      <span className="relative z-10">{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };
