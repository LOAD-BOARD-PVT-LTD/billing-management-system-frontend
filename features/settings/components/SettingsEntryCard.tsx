import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { SettingsEntry } from '@/features/settings/model/settings-catalog';

export function SettingsEntryCard({ entry }: { entry: SettingsEntry }) {
  const Icon = entry.icon;
  const isAvailable = Boolean(entry.href);

  return (
    <Card id={entry.id} tabIndex={-1} className="scroll-mt-28 rounded-lg border-border/80 p-4 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{entry.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {isAvailable ? 'उपलब्ध' : 'जडान छैन'}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{entry.description}</p>
          {entry.unavailableReason ? <p className="mt-2 border-l-2 border-amber-300 pl-2 text-[11px] leading-4 text-muted-foreground">{entry.unavailableReason}</p> : null}
          {entry.href ? <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs"><Link href={entry.href}>{entry.actionLabel ?? 'खोल्नुहोस्'}</Link></Button> : null}
        </div>
      </div>
    </Card>
  );
}