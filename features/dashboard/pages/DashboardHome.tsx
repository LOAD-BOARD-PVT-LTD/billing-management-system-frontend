'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollectionSummary } from '@/features/dashboard/components/CollectionSummary';
import { DashboardMetrics } from '@/features/dashboard/components/DashboardMetrics';
import { IncomeTrendChart } from '@/features/dashboard/components/IncomeTrendChart';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { RecentBillingTable } from '@/features/dashboard/components/RecentBillingTable';
import { SystemActivity } from '@/features/dashboard/components/SystemActivity';
import { VehicleBreakdown } from '@/features/dashboard/components/VehicleBreakdown';
import { dashboardData } from '@/features/dashboard/data/dashboard-data';
import { useDashboardStatistics } from '@/features/dashboard/hooks/useDashboardStatistics';
import {
  buildAllVehicleTypeSegments,
  buildCollectionSummaryData,
  buildDashboardKpiMetrics,
  buildIncomeTrendData,
  buildPaymentMethodSummaryData,
  buildRecentBillingsData,
  buildSystemActivityData,
  buildVehicleBreakdownData,
  filterReceiptsByFiscalYear,
  resolveMemberStatisticsWithFallback,
} from '@/features/dashboard/utils/dashboard-analytics';
import { useMembers } from '@/features/members/hooks/use-members';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import { calculateMembers } from '@/features/members/utils/member-calculations';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { useFiscalYearManagement } from '@/features/settings/hooks/useFiscalYearManagement';
import { useVehicleBlacklist } from '@/features/vehicle/blacklist/hooks/useVehicleBlacklist';
import { Role } from '@/types/auth';
import { formatFiscalYearForDisplay, generateNepaliFiscalYearOptions } from '@/utils/nepali-calender-dates/nepali-fiscal-year';

export function DashboardHome() {
  const { user, hasRole } = useAuth();
  const displayName = user?.name || user?.email || 'सदस्य';
  const roleLabel = hasRole(Role.Admin) ? 'प्रशासक' : 'कर्मचारी';

  const { fiscalYears: managedFiscalYears, reload: reloadFiscalYears } = useFiscalYearManagement();
  const generatedFiscalYears = useMemo(() => generateNepaliFiscalYearOptions({
    yearsBack: 3,
    yearsForward: 1,
  }), []);

  const fiscalYearOptions = useMemo(() => {
    const unique = new Set<string>([
      ...managedFiscalYears.map((fy) => fy.id || fy.name).filter(Boolean),
      ...generatedFiscalYears,
    ]);
    return Array.from(unique);
  }, [generatedFiscalYears, managedFiscalYears]);

  const defaultFiscalYear = managedFiscalYears.find((fy) => fy.isDefault)?.id
    ?? managedFiscalYears.find((fy) => fy.status === 'ACTIVE')?.id
    ?? fiscalYearOptions[0]
    ?? '';
  const [selectedFiscalYearOverride, setSelectedFiscalYearOverride] = useState('');
  const fiscalYear = selectedFiscalYearOverride || defaultFiscalYear;

  const statsQuery = useDashboardStatistics(fiscalYear);
  const receiptsQuery = useReceipts();
  const membersQuery = useMembers();
  const blacklistQuery = useVehicleBlacklist();
  const vehiclesQuery = useMemberVehicles();

  const memberCalculation = useMemo(
    () => calculateMembers(
      receiptsQuery.records,
      managedFiscalYears,
      fiscalYear,
      membersQuery.memberResources,
      blacklistQuery.records,
      vehiclesQuery.vehicles,
    ),
    [
      blacklistQuery.records,
      fiscalYear,
      managedFiscalYears,
      membersQuery.memberResources,
      receiptsQuery.records,
      vehiclesQuery.vehicles,
    ],
  );

  const fiscalYearReceipts = useMemo(
    () => filterReceiptsByFiscalYear(receiptsQuery.records, fiscalYear),
    [fiscalYear, receiptsQuery.records],
  );

  const { statistics, isFallback } = useMemo(
    () => resolveMemberStatisticsWithFallback(statsQuery.statistics, memberCalculation.counts),
    [memberCalculation.counts, statsQuery.statistics],
  );

  const kpiMetrics = useMemo(
    () => buildDashboardKpiMetrics({
      statistics,
      blacklistedCount: memberCalculation.counts.blacklisted,
      fiscalYearReceipts,
    }),
    [fiscalYearReceipts, memberCalculation.counts.blacklisted, statistics],
  );

  const incomeTrend = useMemo(
    () => buildIncomeTrendData(fiscalYearReceipts),
    [fiscalYearReceipts],
  );

  const vehicleBreakdown = useMemo(
    () => buildVehicleBreakdownData(memberCalculation.records, vehiclesQuery.vehicles),
    [memberCalculation.records, vehiclesQuery.vehicles],
  );

  const allVehicleSegments = useMemo(
    () => buildAllVehicleTypeSegments(memberCalculation.records, vehiclesQuery.vehicles),
    [memberCalculation.records, vehiclesQuery.vehicles],
  );

  const recentBillings = useMemo(
    () => buildRecentBillingsData(fiscalYearReceipts, 6),
    [fiscalYearReceipts],
  );

  const feeHeadSummary = useMemo(
    () => buildCollectionSummaryData(fiscalYearReceipts, 6),
    [fiscalYearReceipts],
  );

  const paymentMethodSummary = useMemo(
    () => buildPaymentMethodSummaryData(fiscalYearReceipts),
    [fiscalYearReceipts],
  );

  const systemActivities = useMemo(
    () => buildSystemActivityData({
      fiscalYearReceipts,
      inactiveCount: statistics.inactiveMembers,
      blacklistedCount: memberCalculation.counts.blacklisted,
      fiscalYear,
    }),
    [fiscalYear, fiscalYearReceipts, memberCalculation.counts.blacklisted, statistics.inactiveMembers],
  );

  const isAnyLoading = statsQuery.isLoading
    && receiptsQuery.isLoading
    && membersQuery.isLoading;

  const isRefreshing = statsQuery.isLoading || receiptsQuery.isLoading || membersQuery.isLoading;

  const handleRefreshAll = () => {
    void Promise.allSettled([
      statsQuery.reload(),
      receiptsQuery.reload(),
      membersQuery.reload(),
      blacklistQuery.reload(),
      vehiclesQuery.reload(),
      reloadFiscalYears(),
    ]);
  };

  return (
    <section className="space-y-5 pb-8">
      <header className="rounded-xl border border-border/80 bg-gradient-to-br from-primary/5 via-card to-muted/30 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                सदस्यता शुल्क व्यवस्थापन प्रणाली
              </span>
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                {roleLabel}
              </Badge>
              {isFallback && !isAnyLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Sparkles className="size-3" aria-hidden="true" />
                  सदस्य तथा बिलिङ अभिलेखबाट लाइभ गणना
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">
              नमस्कार, {displayName}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              आर्थिक वर्ष {fiscalYear ? formatFiscalYearForDisplay(fiscalYear) : '—'} को सदस्यता, सङ्कलन र सवारी विवरणको समग्र अवस्था।
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2.5">
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              आर्थिक वर्ष
              <Select value={fiscalYear} onValueChange={setSelectedFiscalYearOverride}>
                <SelectTrigger aria-label="ड्यासबोर्डको आर्थिक वर्ष छान्नुहोस्" className="h-9 min-w-36 bg-card">
                  <SelectValue placeholder="आर्थिक वर्ष छान्नुहोस्" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearOptions.map((year) => (
                    <SelectItem key={year} value={year}>{formatFiscalYearForDisplay(year)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-card"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
            >
              <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              ताजा गर्नुहोस्
            </Button>
          </div>
        </div>
      </header>

      {isAnyLoading ? (
        <div role="status" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/30" />
          ))}
        </div>
      ) : (
        <DashboardMetrics metrics={kpiMetrics} />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
        <IncomeTrendChart
          data={incomeTrend.points}
          fiscalYear={fiscalYear}
          totalIncome={incomeTrend.totalIncome}
          growthPct={incomeTrend.growthPct}
        />
        <VehicleBreakdown vehicles={vehicleBreakdown} allVehicles={allVehicleSegments} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <div className="space-y-4">
          <RecentBillingTable records={recentBillings} />
          <div className="grid gap-4 md:grid-cols-2">
            <CollectionSummary
              items={feeHeadSummary}
              title="शीर्षकअनुसार सङ्कलन"
              subtitle={`आर्थिक वर्ष ${fiscalYear ? formatFiscalYearForDisplay(fiscalYear) : ''}`}
              rightLabel="कुल हिस्सा"
            />
            <CollectionSummary
              items={paymentMethodSummary}
              title="भुक्तानी विधिअनुसार सङ्कलन"
              subtitle="नगद, बैंक तथा अनलाइन वितरण"
              rightLabel="कुल हिस्सा"
            />
          </div>
        </div>
        <div className="space-y-4">
          <QuickActions actions={dashboardData.quickActions} />
          <SystemActivity activities={systemActivities} />
        </div>
      </div>
    </section>
  );
}
