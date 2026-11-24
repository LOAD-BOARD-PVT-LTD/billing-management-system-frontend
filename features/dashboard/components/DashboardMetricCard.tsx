import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CarFront,
  CircleDollarSign,
  MapPinOff,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundX,
  Users,
  WalletCards,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/numbers';
import type { DashboardMetric } from '@/features/dashboard/data/dashboard-data';

const metricIcons = {
  members: Users,
  activeMembers: UserRoundCheck,
  newSubscriptions: UserRoundPlus,
  inactiveMembers: UserRoundX,
  blacklistedMembers: Ban,
  displacedMembers: MapPinOff,
  vehicles: CarFront,
  income: CircleDollarSign,
  pending: WalletCards,
};

const metricTones = {
  members: 'bg-blue-50 text-blue-700 ring-blue-100',
  activeMembers: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  newSubscriptions: 'bg-violet-50 text-violet-700 ring-violet-100',
  inactiveMembers: 'bg-amber-50 text-amber-700 ring-amber-100',
  blacklistedMembers: 'bg-rose-50 text-rose-700 ring-rose-100',
  displacedMembers: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  vehicles: 'bg-sky-50 text-sky-700 ring-sky-100',
  income: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  pending: 'bg-rose-50 text-rose-700 ring-rose-100',
};

export function DashboardMetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.icon];
  const isPositive = (metric.change ?? 0) >= 0;
  const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  const formattedValue = metric.icon === 'income'
    ? `रु ${formatCurrency(metric.value)}`
    : formatNumber(metric.value);

  const content = (
    <article className="group h-full min-w-0 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{metric.title}</p>
          <p className="mt-2 truncate text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {formattedValue}
          </p>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-lg ring-1 ${metricTones[metric.icon]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>
      {metric.change !== undefined ? (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
          <ChangeIcon aria-hidden="true" className="size-3.5" />
          <span>{Math.abs(metric.change)}%</span>
          <span className="font-normal text-muted-foreground">अघिल्लो महिनाको तुलनामा</span>
        </div>
      ) : null}
    </article>
  );

  if (metric.href) {
    return (
      <Link href={metric.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
