'use client';

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

interface ChartSkeletonProps {
  className?: string;
  height?: number;
  type?: 'line' | 'pie' | 'bar';
}

export function ChartSkeleton({ className, height = 280, type = 'line' }: ChartSkeletonProps) {
  const shouldReduceMotion = useReducedMotion();

                                                                                             
  const [randomHeights] = useState(() => {
    return Array.from({ length: 8 }, () => [
      `${30 + Math.random() * 50}%`,
      `${20 + Math.random() * 60}%`,
      `${40 + Math.random() * 50}%`,
    ]);
  });

  const baseClasses = 'rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50';

  if (type === 'pie') {
    return (
      <div className={cn('flex items-center justify-center', baseClasses, className)} style={{ height }}>
        <div className="relative">
          <motion.div
            animate={shouldReduceMotion ? {} : { rotate: 360 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 3,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="h-32 w-32 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

                               
  return (
    <div className={cn('relative overflow-hidden', baseClasses, className)} style={{ height }}>
      <div className="absolute inset-0 flex items-end justify-between gap-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            initial={shouldReduceMotion ? { height: '40%' } : { height: '10%' }}
            animate={{
              height: shouldReduceMotion ? '40%' : randomHeights[i],
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 1.5,
              repeat: Infinity,
              repeatType: 'reverse',
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
            className="w-full rounded-t bg-gradient-to-t from-primary/40 to-primary/20"
            style={{ maxWidth: '8%' }}
          />
        ))}
      </div>
    </div>
  );
}

