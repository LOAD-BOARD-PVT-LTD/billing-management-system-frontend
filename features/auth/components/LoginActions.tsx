'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { useTranslations } from '@/utils/translations'
import { motion, useReducedMotion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'

interface LoginActionsProps {
  isSubmitting: boolean
}

export function LoginActions({ isSubmitting }: LoginActionsProps) {
  const { t } = useTranslations()
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.4, ease: 'easeOut', delay: 0.15 }}
      className="pt-2"
    >
      <Button
        type="submit"
        variant="primary-enhanced"
        size="lg"
        className={cn(
          'w-full h-[52px] text-[15px] font-bold rounded-xl',
          'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
          'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]',
          'transition-all duration-200',
        )}
        loading={isSubmitting}
        leftIcon={!isSubmitting ? <ShieldCheck className="h-5 w-5" /> : undefined}
        aria-busy={isSubmitting}
        aria-live="polite"
      >
        {isSubmitting ? t('auth.loginInProgress') : t('auth.login')}
      </Button>
    </motion.div>
  )
}
