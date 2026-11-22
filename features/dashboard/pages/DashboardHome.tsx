'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollectionSummary } from '@/features/dashboard/components/CollectionSummary';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import { DashboardWelcome } from '@/features/dashboard/components/DashboardWelcome';
import { IncomeTrendChart } from '@/features/dashboard/components/IncomeTrendChart';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { RecentBillingTable } from '@/features/dashboard/components/RecentBillingTable';
import { SystemActivity } from '@/features/dashboard/components/SystemActivity';
import { VehicleBreakdown } from '@/features/dashboard/components/VehicleBreakdown';
import { dashboardData } from '@/features/dashboard/data/dashboard-data';
import { dashboardMemberMetrics } from '@/features/dashboard/data/dashboard-statistics';
import { useDashboardStatistics } from '@/features/dashboard/hooks/useDashboardStatistics';
import { Role } from '@/types/auth';
import { generateNepaliFiscalYearOptions, formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export function DashboardHome() {
  const { user, hasRole } = useAuth();
  const displayName = user?.name || user?.email || 'सदस्य';
  const roleLabel = hasRole(Role.Admin) ? 'प्रशासक' : 'कर्मचारी';
  const fiscalYears = useMemo(() => generateNepaliFiscalYearOptions({
    yearsBack: 3,
    yearsForward: 0,
  }), []);
  const [fiscalYear, setFiscalYear] = useState(() => fiscalYears[0] ?? '');
  const { statistics, isLoading, error, reload } = useDashboardStatistics(fiscalYear);
  const metrics = statistics
    ? dashboardMemberMetrics.map(({ key, title, icon }) => ({
      title,
      icon,
      value: statistics[key],
    }))
    : [];

  return (
    <section className="space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DashboardWelcome displayName={displayName} roleLabel={roleLabel} />
        <label className="space-y-1 text-xs text-muted-foreground">
          आर्थिक वर्ष
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger aria-label="ड्यासबोर्डको आर्थिक वर्ष छान्नुहोस्" className="h-8 min-w-36">
              <SelectValue placeholder="आर्थिक वर्ष छान्नुहोस्" />
            </SelectTrigger>
            <SelectContent>
              {fiscalYears.map((year) => (
                <SelectItem key={year} value={year}>{formatFiscalYearForDisplay(year)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <span>ड्यासबोर्ड तथ्याङ्क लोड गर्न सकिएन: {error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            पुनः प्रयास
          </Button>
        </div>
      ) : isLoading ? (
        <p role="status" className="rounded-md border bg-card p-4 text-sm text-muted-foreground">
          ड्यासबोर्ड तथ्याङ्क लोड हुँदैछ...
        </p>
      ) : (
        <DashboardMetrics metrics={metrics} />
      )}

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