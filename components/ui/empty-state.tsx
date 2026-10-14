'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  illustration?: 'chart' | 'data' | 'growth' | 'none';
  size?: 'sm' | 'md' | 'lg';
}

const illustrationIcons: Record<string, LucideIcon> = {
  chart: BarChart3,
  data: PieChart,
  growth: TrendingUp,
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  illustration = 'data',
  size = 'md',
}: EmptyStateProps) {
  const shouldReduceMotion = useReducedMotion();
  const IllustrationIcon = illustrationIcons[illustration] || icon || BarChart3;
  const Icon = icon || IllustrationIcon;

  const sizes = {
    sm: {
      icon: 'h-12 w-12',
      title: 'text-base',
      description: 'text-sm',
      spacing: 'space-y-3',
      padding: 'p-6',
    },
    md: {
      icon: 'h-16 w-16',
      title: 'text-lg',
      description: 'text-sm',
      spacing: 'space-y-4',
      padding: 'p-8',
    },
    lg: {
      icon: 'h-20 w-20',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-5',
      padding: 'p-12',
    },
  };

  const sizeClasses = sizes[size];

  const content = (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses.padding,
        sizeClasses.spacing,
        className
      )}
    >
      {                                                  }
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 via-primary/5 to-transparent blur-2xl opacity-50" />
        <motion.div
          initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-4',
            sizeClasses.icon
          )}
        >
          <Icon className={cn('text-muted-foreground/60', sizeClasses.icon)} strokeWidth={1.5} />
        </motion.div>
      </div>

      {                  }
      <div className={cn('flex flex-col gap-2', sizeClasses.spacing)}>
        <h3 className={cn('font-semibold text-foreground', sizeClasses.title)}>{title}</h3>
        {description && (
          <p className={cn('text-muted-foreground/80 max-w-sm', sizeClasses.description)}>{description}</p>
        )}
      </div>

      {                   }
      {actionLabel && (actionHref || onAction) && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.1, duration: 0.2 }}
        >
          {actionHref ? (
            <Button
              asChild
              variant="default"
              size={size === 'lg' ? 'default' : 'sm'}
              className="group gap-2 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              <a href={actionHref}>
                {actionLabel}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Button>
          ) : (
            <Button
              onClick={onAction}
              variant="default"
              size={size === 'lg' ? 'default' : 'sm'}
              className="group gap-2 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );

  return content;
}

