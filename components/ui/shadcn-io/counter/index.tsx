'use client';

import { motion, type HTMLMotionProps, type Transition } from 'motion/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  SlidingNumber,
  type SlidingNumberProps,
} from '@/components/ui/shadcn-io/sliding-number';
import { cn } from '@/utils/cn';

type CounterProps = HTMLMotionProps<'div'> & {
  number: number;
  setNumber: (number: number) => void;
  slidingNumberProps?: Omit<SlidingNumberProps, 'number'>;
  buttonProps?: Omit<React.ComponentProps<typeof Button>, 'onClick'>;
  transition?: Transition;
};

function Counter({
  number,
  setNumber,
  className,
  slidingNumberProps,
  buttonProps,
  transition = { type: 'spring', bounce: 0, stiffness: 300, damping: 30 },
  ...props
}: CounterProps) {
  return (
    <motion.div
      data-slot="counter"
      layout
      transition={transition}
      className={cn(
        'flex items-center gap-x-2 p-1 rounded-xl bg-neutral-100',
        className,
      )}
      {...props}
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          size="icon"
          {...buttonProps}
          onClick={() => setNumber(number - 1)}
          className={cn(
            'bg-white hover:bg-white/70 text-neutral-950 text-2xl font-light pb-[3px]',
            buttonProps?.className,
          )}
        >
          -
        </Button>
      </motion.div>

      <SlidingNumber
        number={number}
        {...slidingNumberProps}
        className={cn('text-lg', slidingNumberProps?.className)}
      />

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          size="icon"
          {...buttonProps}
          onClick={() => setNumber(number + 1)}
          className={cn(
            'bg-white hover:bg-white/70 text-neutral-950 text-2xl font-light pb-[3px]',
            buttonProps?.className,
          )}
        >
          +
        </Button>
      </motion.div>
    </motion.div>
  );
}

export { Counter, type CounterProps };

