'use client';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useTranslations } from '@/utils/translations';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginFooter } from '@/features/auth/components/LoginFooter';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LoginHeader } from '@/features/auth/components/LoginHeader';

export default function LoginPage() {
  const { isAuthenticated, isLoading, authReady } = useAuth();
  const router = useRouter();
  const { t } = useTranslations();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (authReady && !isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authReady, isAuthenticated, isLoading, router]);
                                                           
                                                                                   
  if (!authReady && isLoading) {
    return <LoadingSpinner fullScreen size="lg" label={t('auth.loadingTitle')} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/15 to-purple-400/15 blur-3xl"
          animate={reduceMotion ? undefined : {
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.4, 0.3],
          }}
          transition={reduceMotion ? undefined : {
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-purple-400/15 to-pink-400/15 blur-3xl"
          animate={reduceMotion ? undefined : {
            scale: [1.15, 1, 1.15],
            opacity: [0.3, 0.2, 0.3],
          }}
          transition={reduceMotion ? undefined : {
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[460px] items-center px-4 py-8">
        <motion.section
          className="w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white/98 shadow-2xl backdrop-blur-xl"
          initial={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? undefined : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          aria-label={t('auth.login')}
        >
          <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/30 px-6 py-6 sm:px-8 sm:py-7">
            <LoginHeader />
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <LoginForm />
          </div>

          <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4 sm:px-8">
            <LoginFooter />
          </div>
        </motion.section>
      </div>
    </div>
  );
}
