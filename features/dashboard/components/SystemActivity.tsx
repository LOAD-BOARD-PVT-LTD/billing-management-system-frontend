import { AlertTriangle, Check, Info } from 'lucide-react';
import type { DashboardActivity } from '@/features/dashboard/data/dashboard-data';

const stateStyles = {
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
};

const stateIcons = {
  success: Check,
  warning: AlertTriangle,
  info: Info,
};

export function SystemActivity({ activities }: { activities: DashboardActivity[] }) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm shadow-black/[0.02]" aria-labelledby="system-activity-title">
      <div className="mb-3">
        <h2 id="system-activity-title" className="text-sm font-semibold">हालका गतिविधि</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">प्रणालीमा भएका पछिल्ला परिवर्तन</p>
      </div>
      <ol className="space-y-3">
        {activities.map((activity) => {
          const Icon = stateIcons[activity.state];
          return (
            <li key={`${activity.title}-${activity.time}`} className="flex gap-2.5">
              <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${stateStyles[activity.state]}`}>
                <Icon aria-hidden="true" className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium leading-5">{activity.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{activity.detail}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{activity.time}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}