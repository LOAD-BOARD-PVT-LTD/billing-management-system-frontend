import Link from 'next/link';
import { ArrowUpRight, BarChart3, FilePlus2, ReceiptText, Users } from 'lucide-react';
import type { DashboardAction } from '@/features/dashboard/data/dashboard-data';

const actionIcons = {
  billing: FilePlus2,
  members: Users,
  receipt: ReceiptText,
  report: BarChart3,
};

export function QuickActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm shadow-black/[0.02]" aria-labelledby="quick-actions-title">
      <div className="mb-3">
        <h2 id="quick-actions-title" className="text-sm font-semibold">छिटो कार्यहरू</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">बारम्बार प्रयोग हुने पृष्ठहरू</p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = actionIcons[action.icon];
          return (
            <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{action.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{action.detail}</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}