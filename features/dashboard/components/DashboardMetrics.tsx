import { DashboardMetricCard } from '@/features/dashboard/components/DashboardMetricCard';
import type { DashboardMetric } from '@/features/dashboard/data/dashboard-data';

export function DashboardMetrics({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => <DashboardMetricCard key={metric.icon} metric={metric} />)}
    </div>
  );
}