import { PropsWithChildren } from 'react';

import { Card } from '@/components/ui/card';

type ShellProps = PropsWithChildren<{ title: string; description: string }>;

export function Shell({ title, description, children }: ShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <Card className="bg-[var(--mb-card)]/80 p-8 shadow-[var(--mb-shadow-lg)] backdrop-blur">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-[var(--mb-foreground)]">{title}</h1>
          <p className="text-[var(--mb-muted-foreground)]">{description}</p>
        </div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

