'use client';

import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/common/layout/Breadcrumbs';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { NepaliDateDisplay } from '@/components/common/NepaliDateDisplay';
import { SidebarNav } from '@/components/common/layout/SidebarNav';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useFontasyHimali } from '@/contexts/fontasy-himali-context';
import { canAccessDashboardPath } from '@/components/common/layout/navigation/sidebar-config';
import { Role } from '@/types/auth';
import { useTranslations } from '@/utils/translations';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function DashboardHeader() {
  const { state } = useSidebar();
  const { t } = useTranslations();
  const { enabled, setEnabled } = useFontasyHimali();
  const isCollapsed = state === 'collapsed';

  return (
    <header className="sticky top-0 z-40 flex h-auto min-h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {!isCollapsed && (
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="-ml-1" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            {t('navigation.toggleSidebar')}
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex w-full flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4 md:py-0">
        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="w-full md:max-w-md">
            <GlobalSearch />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={enabled ? 'secondary' : 'outline'}
                size="sm"
                className="shrink-0 gap-2"
                aria-pressed={enabled}
                aria-label={`फन्टासी हिमाली TT नेपाली टाइपिङ ${enabled ? 'चालू' : 'बन्द'}`}
                onClick={() => setEnabled(!enabled)}
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span>नेपाली टाइपिङ</span>
                <span className="text-xs text-muted-foreground">{enabled ? 'चालू' : 'बन्द'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              फन्टासी हिमाली TT नेपाली टाइपिङ चालू/बन्द गर्नुहोस्
            </TooltipContent>
          </Tooltip>
          <div className="hidden sm:block">
            <NepaliDateDisplay />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardRouteLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, authReady, hasRole } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const hasRouteAccess = canAccessDashboardPath(pathname, hasRole(Role.Admin));
  const shouldReduceMotion = useReducedMotion();
  const [isBillingNewHeaderHidden, setIsBillingNewHeaderHidden] = useState(false);
  const isBillingHeaderToggleRoute = pathname === '/dashboard/billing-new';

  const scrollStorageKey = useMemo(() => `scroll:${pathname}`, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.sessionStorage.getItem(scrollStorageKey);
      const y = saved ? Number(saved) : 0;
      if (!Number.isFinite(y) || y <= 0) return;
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'auto' }));
    } catch {}
  }, [scrollStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;

    const save = () => {
      try {
        window.sessionStorage.setItem(scrollStorageKey, String(window.scrollY || 0));
      } catch {}
    };

    const onScroll = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(save);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      save();
    };
  }, [scrollStorageKey]);

  useEffect(() => {
    if (!authReady || isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!hasRouteAccess) {
      router.replace('/dashboard');
    }
  }, [authReady, hasRouteAccess, isAuthenticated, isLoading, router]);

  useEffect(() => {
    const handleHeaderVisibilityChange = (event: Event) => {
      const detail = (event as CustomEvent<{ hidden?: boolean }>).detail;
      setIsBillingNewHeaderHidden(Boolean(detail?.hidden));
    };

    window.addEventListener('billing-new-header-visibility-change', handleHeaderVisibilityChange);
    return () => {
      window.removeEventListener('billing-new-header-visibility-change', handleHeaderVisibilityChange);
    };
  }, []);

  if (!authReady || isLoading || !isAuthenticated || !hasRouteAccess) {
    return (
      <LoadingSpinner
        fullScreen
        size="lg"
        label={t('system.loading')}
        description={t('system.loadingSubtitle')}
      />
    );
  }

  return (
    <SidebarProvider>
      <SidebarNav />
      <SidebarInset>
        {!(isBillingHeaderToggleRoute && isBillingNewHeaderHidden) && <DashboardHeader />}
        <Suspense
          fallback={(
            <LoadingSpinner
              fullScreen
              size="lg"
              label={t('system.loading')}
              description={t('system.loadingSubtitle')}
            />
          )}
        >
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -20 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: 'easeOut' }}
              className={isBillingHeaderToggleRoute ? 'flex-1 p-2 lg:p-3' : 'flex-1 p-4 lg:p-6'}
            >
              <div className={isBillingHeaderToggleRoute ? 'w-full' : 'mx-auto max-w-7xl'}>{children}</div>
            </motion.main>
          </AnimatePresence>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}