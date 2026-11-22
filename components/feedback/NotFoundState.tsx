'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Compass, Home, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface NotFoundStateProps {
  code?: string;
  badge?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  primaryHref?: string;
  primaryLabel?: string;
  showBackButton?: boolean;
  className?: string;
}

export function NotFoundState({
  code = '404',
  badge = 'पृष्ठ भेटिएन',
  title = 'यो पृष्ठ फेला परेन',
  description = 'तपाईंले खोज्नुभएको पृष्ठ उपलब्ध छैन, हटाइएको छ वा ठेगाना परिवर्तन भएको हुन सक्छ।',
  icon: Icon = Compass,
  primaryHref = '/dashboard',
  primaryLabel = 'ड्यासबोर्डमा जानुहोस्',
  showBackButton = true,
  className,
}: NotFoundStateProps) {
  const router = useRouter();

  return (
    <section
      aria-labelledby="not-found-title"
      className={cn(
        'relative flex min-h-[70vh] w-full items-center justify-center overflow-hidden px-4 py-12',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_60%)]"
      />

      <div className="relative w-full max-w-xl rounded-2xl border border-border/80 bg-card/95 p-6 text-center shadow-sm backdrop-blur sm:p-10">
        <div className="mx-auto mb-5 flex flex-col items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {badge}
          </span>

          <div className="relative flex items-center justify-center">
            <span
              aria-hidden="true"
              className="select-none bg-gradient-to-b from-foreground/20 to-foreground/5 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl"
            >
              {code}
            </span>
            <span className="absolute grid size-14 place-items-center rounded-2xl border border-border bg-background/90 text-primary shadow-sm">
              <Icon className="size-7" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 id="not-found-title" className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href={primaryHref}>
              <Home className="mr-1.5 size-4" aria-hidden="true" />
              {primaryLabel}
            </Link>
          </Button>
          {showBackButton ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
              अघिल्लो पृष्ठमा जानुहोस्
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
