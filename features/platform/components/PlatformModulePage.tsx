import { CircleAlert, PlugZap } from 'lucide-react';

import { Card } from '@/components/ui/card';

export function PlatformModulePage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700">Platform administration</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <div role="note" className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-950"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>This module is an integration scaffold. No platform API or authorization contract for this data is connected in the current project.</span></div>
      <Card className="rounded-lg border-dashed border-border bg-white p-8 shadow-none">
        <div className="mx-auto flex max-w-lg flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><PlugZap className="h-5 w-5" aria-hidden="true" /></span>
          <h2 className="mt-3 text-sm font-semibold">Awaiting platform service</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">The page structure is ready, but no placeholder records or mutations are shown as real platform data. Connect the backend contract to enable this module.</p>
        </div>
      </Card>
    </div>
  );
}