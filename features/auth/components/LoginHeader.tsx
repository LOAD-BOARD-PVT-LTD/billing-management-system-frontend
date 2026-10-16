'use client';

import { useTranslations } from '@/utils/translations';
import { motion, useReducedMotion } from 'framer-motion';
import { useOrganization } from '@/contexts/organization-context';

export function LoginHeader() {
  const { organization } = useOrganization();
  const organizationName = organization.nameNepali;
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="space-y-6"
      initial={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? undefined : { duration: 0.4, ease: 'easeOut', delay: 0.1 }}
    >
      <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-primary via-primary-hover to-primary" />

      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 ring-1 ring-primary/20">
            <motion.div 
              className="h-1.5 w-1.5 rounded-full bg-primary"
              animate={reduceMotion ? undefined : {
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={reduceMotion ? undefined : {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              {t('app.name')}
            </span>
          </div>
          
          <div className="space-y-0.5">
            <h2
              className="truncate text-2xl font-bold tracking-tight text-primary"
              title={organizationName}
            >
              {organizationName}
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-tight">
          Welcome back
        </h1>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Sign in to continue to your account
        </p>
      </div>
    </motion.div>
  );
}
