import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import type { DashboardMetric } from '@/features/dashboard/data/dashboard-data';

export function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {metrics.map((metric) => (
        <DashboardMetricCard key={`${metric.icon}-${metric.title}`} metric={metric} />
      ))}
    </div>
  );
}
