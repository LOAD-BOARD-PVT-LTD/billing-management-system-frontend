'use client';

import { useAuth } from '@/contexts/auth-context';
import { CollectionSummary } from '@/features/dashboard/components/CollectionSummary';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import { DashboardWelcome } from '@/features/dashboard/components/DashboardWelcome';
import { IncomeTrendChart } from '@/features/dashboard/components/IncomeTrendChart';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { RecentBillingTable } from '@/features/dashboard/components/RecentBillingTable';
import { SystemActivity } from '@/features/dashboard/components/SystemActivity';
import { VehicleBreakdown } from '@/features/dashboard/components/VehicleBreakdown';
import { dashboardData } from '@/features/dashboard/data/dashboard-data';
import { Role } from '@/types/auth';

export function DashboardHome() {
  const { user, hasRole } = useAuth();
  const displayName = user?.name || user?.email || 'सदस्य';
  const roleLabel = hasRole(Role.Admin) ? 'प्रशासक' : 'कर्मचारी';

  return (
    <section className="space-y-5 pb-6">
      <DashboardWelcome displayName={displayName} roleLabel={roleLabel} />
      <DashboardMetrics metrics={dashboardData.metrics} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <IncomeTrendChart data={dashboardData.incomeTrend} />
        <VehicleBreakdown vehicles={dashboardData.vehicleBreakdown} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="space-y-4">
          <RecentBillingTable records={dashboardData.recentBillings} />
          <CollectionSummary items={dashboardData.collectionSummary} />
        </div>
        <div className="space-y-4">
          <QuickActions actions={dashboardData.quickActions} />
          <SystemActivity activities={dashboardData.activities} />
        </div>
      </div>
    </section>
  );
}