'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md active:bg-primary-active',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md',
        outline:
          'border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-hover hover:shadow-md',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
        link: 'text-primary underline-offset-4 hover:underline hover:text-primary-hover',
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/90 hover:shadow-md',
        warning:
          'bg-warning text-warning-foreground shadow-sm hover:bg-warning/90 hover:shadow-md',
        info: 'bg-info text-info-foreground shadow-sm hover:bg-info/90 hover:shadow-md',
        gradient:
          'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] transition-all duration-200',
        'primary-enhanced':
          'bg-primary text-primary-foreground shadow-md hover:bg-primary-hover hover:shadow-lg active:bg-primary-active',
      },
      size: {
        xs: 'h-7 px-2 text-xs rounded-md',
        sm: 'h-8 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2 rounded-lg',
        lg: 'h-11 px-6 text-base rounded-lg',
        xl: 'h-12 px-8 text-lg rounded-lg',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-lg': 'h-11 w-11 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    if (asChild) {
                                                                      
                                                                        
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} {...props}>
          {children as React.ReactElement}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

