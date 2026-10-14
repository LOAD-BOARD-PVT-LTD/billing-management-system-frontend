'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/utils/translations';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react';

interface LoginFieldsProps {
  formData: {
    email: string;
    password: string;
  };
  errors: Record<string, string>;
  showPassword: boolean;
  capsLockWarning: boolean;
  hasValidEmail: boolean;
  hasValidPassword: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
}

function InlineNotice({
  tone,
  children,
  id,
}: {
  tone: 'danger' | 'warning';
  children: React.ReactNode;
  id?: string;
}) {
  const Icon = tone === 'danger' ? AlertCircle : Info;
  const classes =
    tone === 'danger'
      ? 'border-red-200/80 bg-red-50 text-red-700'
      : 'border-amber-200/80 bg-amber-50 text-amber-800';

  return (
    <motion.div
      className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-sm', classes)}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      role={tone === 'danger' ? 'alert' : 'status'}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      id={id}
    >
      <Icon className="mt-0.5 h-4 w-4" aria-hidden="true" />
      <div className="leading-relaxed">{children}</div>
    </motion.div>
  );
}

export function LoginFields({
  formData,
  errors,
  showPassword,
  capsLockWarning,
  hasValidEmail,
  hasValidPassword,
  handleInputChange,
  handleKeyDown,
  setShowPassword,
  isSubmitting,
}: LoginFieldsProps) {
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-3" aria-live="polite">
      {                   }
      <AnimatePresence>
        {errors.general && (
          <InlineNotice tone="danger" id="form-error">
            {errors.general}
          </InlineNotice>
        )}
      </AnimatePresence>

      {                       }
      <AnimatePresence>
        {capsLockWarning && (
          <InlineNotice tone="warning">{t('auth.capsLockWarning')}</InlineNotice>
        )}
      </AnimatePresence>

      {           }
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
          {t('auth.emailLabel')}
        </Label>

        <div className="relative group">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-all duration-200 group-focus-within:text-primary group-focus-within:scale-105" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            error={!!errors.email}
            success={hasValidEmail}
            disabled={isSubmitting}
            autoFocus
            placeholder={t('auth.emailPlaceholder')}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={cn(
              'h-[52px] pl-12 pr-12 text-[15px] font-medium',
              'bg-white border-2 rounded-xl',
              'focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:scale-[1.01]',
              'transition-all duration-200',
              'shadow-sm hover:shadow-md hover:border-slate-300',
              hasValidEmail && 'border-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 pr-12',
              errors.email && 'border-red-500/70',
            )}
          />
          {hasValidEmail && (
            <motion.div
              className="absolute right-4 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <motion.svg
                className="h-5 w-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                />
              </motion.svg>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {errors.email && (
            <motion.p
              className="flex items-center gap-2 text-[13px] text-red-600 font-medium"
              initial={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              id="email-error"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {errors.email}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {              }
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
          {t('auth.passwordLabel')}
        </Label>

        <div className="relative group">
          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-all duration-200 group-focus-within:text-primary group-focus-within:scale-105" />
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            error={!!errors.password}
            success={hasValidPassword}
            disabled={isSubmitting}
            placeholder={t('auth.passwordPlaceholder')}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={cn(
              'h-[52px] pl-12 pr-12 text-[15px] font-medium',
              'bg-white border-2 rounded-xl',
              'focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:scale-[1.01]',
              'transition-all duration-200',
              'shadow-sm hover:shadow-md hover:border-slate-300',
              hasValidPassword && 'border-emerald-500/50 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10',
              errors.password && 'border-red-500/70',
            )}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2',
              'text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              'disabled:opacity-50',
              'transition-all duration-150',
              'active:scale-95'
            )}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {errors.password && (
            <motion.p
              className="flex items-center gap-2 text-[13px] text-red-600 font-medium"
              initial={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
              id="password-error"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {errors.password}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {                       }
      <div className="flex items-center justify-between pt-1">

        <button
          type="button"
          className="text-[14px] font-semibold text-primary hover:text-primary-hover underline-offset-4 hover:underline transition-all duration-150 rounded-md px-2 py-1 hover:bg-primary/5 active:scale-95"
          aria-disabled="true"
        >
          {t('auth.forgotPassword')}
        </button>
      </div>
    </div>
  );
}
