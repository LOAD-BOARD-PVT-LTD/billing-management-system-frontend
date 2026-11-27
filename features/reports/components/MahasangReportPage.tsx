'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DataTableColumn } from '@/components/data-tables/DataTable';
import { useAuth } from '@/contexts/auth-context';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';
import { fetchMemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { getMemberOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';
import { MahasangReportColumnMenu } from '@/features/reports/components/MahasangReportColumnMenu';
import { ReportDataTable } from '@/features/reports/components/ReportDataTable';
import { ReportFiltersCard } from '@/features/reports/components/ReportFiltersCard';
import { ReportMetric } from '@/features/reports/components/ReportMetric';
import { ReportPageShell } from '@/features/reports/components/ReportPageShell';
import { useIncomeReportFilters } from '@/features/reports/hooks/use-income-report-filters';
import { useMahasangReportColumns } from '@/features/reports/hooks/use-mahasang-report-columns';
import { useReportHeaderDetails } from '@/features/reports/hooks/use-report-header-details';
import { createMahasangReportTemplate } from '@/features/reports/templates/report-templates';
import type { MahasangReportRow } from '@/features/reports/types/summary-reports';
import { hasValidIncomeReportDateRange } from '@/features/reports/utils/income-report-filters';
import {
  MAHASANG_REPORT_COLUMN_OPTIONS,
  type MahasangReportColumnId,
} from '@/features/reports/utils/mahasang-report-columns';
import {
  buildMahasangFilterOptions,
  filterMahasangReceipts,
} from '@/features/reports/utils/mahasang-report-filters';
import { formatReportAmount, formatReportDate } from '@/features/reports/utils/report-format';
import { buildMahasangRows } from '@/features/reports/utils/summary-reports';
import { resolveDefaultMahasangVehicleTypes } from '@/features/settings/api/mahasang-report-settings.api';
import { useMahasangReportSettings } from '@/features/settings/hooks/useMahasangReportSettings';
import { useVehicleTypes } from '@/features/vehicle/type/hooks/useVehicleTypes';
import { vehicleResourceKeys } from '@/lib/query/query-keys';
import { exportReportExcel, exportReportPdf } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

export function MahasangReportPage() {
  const { user: authUser } = useAuth();
  const { records, isLoading, error } = useReceipts();
  const branchesQuery = useBranches();
  const usersQuery = useUsers();
  const billingRules = useBillingRules();
  const vehicleTypesQuery = useVehicleTypes();
  const mahasangSettings = useMahasangReportSettings();
  const vehiclesQuery = useQuery({
    queryKey: vehicleResourceKeys.memberVehicleList('mahasang-report'),
    queryFn: ({ signal }) => fetchMemberVehicleDetails(signal),
    gcTime: 30 * 60 * 1000,
  });

  const { filters, updateFilter, clearFilters, isFiltered } = useIncomeReportFilters();
  const [selectedVehicleTypesOverride, setSelectedVehicleTypesOverride] = useState<string[] | null>(null);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const defaultVehicleTypes = useMemo(
    () => resolveDefaultMahasangVehicleTypes(mahasangSettings.settings),
    [mahasangSettings.settings],
  );
  const selectedVehicleTypes = selectedVehicleTypesOverride ?? defaultVehicleTypes;

  const header = useReportHeaderDetails('महासंघ रिपोर्ट', filters.dateFrom, filters.dateTo);
  const { visibleColumns, applyColumns } = useMahasangReportColumns();
  const validDateRange = hasValidIncomeReportDateRange(filters);

  const filterOptions = useMemo(
    () => buildMahasangFilterOptions({
      receipts: records,
      systemBranches: branchesQuery.records,
      billingRuleFeeHeads: billingRules.config.feeHeads,
      fiscalYears: billingRules.config.fiscalYears,
      selectedFiscalYear: filters.fiscalYear,
      authUser,
      systemUsers: usersQuery.records,
      vehicleTypeRecords: vehicleTypesQuery.records,
      memberVehicles: vehiclesQuery.data ?? [],
      settings: mahasangSettings.settings,
    }),
    [
      authUser,
      billingRules.config.feeHeads,
      billingRules.config.fiscalYears,
      branchesQuery.records,
      filters.fiscalYear,
      mahasangSettings.settings,
      records,
      usersQuery.records,
      vehicleTypesQuery.records,
      vehiclesQuery.data,
    ],
  );

  const filteredReceipts = useMemo(
    () => filterMahasangReceipts(records, { ...filters, vehicleTypes: selectedVehicleTypes }),
    [filters, records, selectedVehicleTypes],
  );

  const rows = useMemo(
    () => buildMahasangRows(filteredReceipts, vehiclesQuery.data ?? []),
    [filteredReceipts, vehiclesQuery.data],
  );

  const totalMembership = useMemo(() => rows.reduce((sum, row) => sum + row.membershipIncome, 0), [rows]);
  const totalOther = useMemo(() => rows.reduce((sum, row) => sum + row.otherIncome, 0), [rows]);

  const allColumns: Record<MahasangReportColumnId, DataTableColumn<MahasangReportRow>> = {
    vehicleNumber: { id: 'vehicleNumber', header: 'गाडी नं.', cell: (row) => row.vehicleNumber },
    previousVehicleNumber: { id: 'previousVehicleNumber', header: 'पुरानो गाडी नं.', cell: (row) => row.previousVehicleNumber },
    vehicleType: { id: 'vehicleType', header: 'सवारी प्रकार', cell: (row) => row.vehicleType },
    ownerName: {
      id: 'ownerName',
      header: 'धनीको नाम',
      cell: (row) => (
        <div className="space-y-0.5">
          {getMemberOwnerDisplayLines(row.ownerName, row.operatorName).map((line) => (
            <p key={`${line.label}-${line.name}`} className="text-xs">
              {line.label ? <span className="text-muted-foreground">{line.label}</span> : null}
              {line.label ? ' ' : ''}<span className="font-medium">{line.name}{line.suffix}</span>
            </p>
          ))}
        </div>
      ),
    },
    ownerPhone: { id: 'ownerPhone', header: 'धनीको फोन', cell: (row) => row.ownerPhone },
    note: { id: 'note', header: 'कैफियत', cell: (row) => row.note },
    receiptNumber: { id: 'receiptNumber', header: 'रसिद नं.', cell: (row) => toNepaliDigits(row.receiptNumber) },
    membershipIncome: { id: 'membershipIncome', header: 'सदस्यताबाट', cell: (row) => formatReportAmount(row.membershipIncome) },
    otherIncome: { id: 'otherIncome', header: 'अन्य आम्दानी', cell: (row) => formatReportAmount(row.otherIncome) },
    total: { id: 'total', header: 'जम्मा', cell: (row) => formatReportAmount(row.total) },
    periodMonths: { id: 'periodMonths', header: 'अवधि महिना', cell: (row) => toNepaliDigits(row.periodMonths) },
    paymentMethod: { id: 'paymentMethod', header: 'भुक्तानी तरिका', cell: (row) => row.paymentMethod },
    billingDate: { id: 'billingDate', header: 'का. मिति', cell: (row) => formatReportDate(row.billingDate) },
    periodStart: { id: 'periodStart', header: 'देखि', cell: (row) => formatReportDate(row.periodStart) },
    periodEnd: { id: 'periodEnd', header: 'सम्म', cell: (row) => formatReportDate(row.periodEnd) },
  };
  const columns = visibleColumns.map((id) => allColumns[id]);
  const exportLabels = Object.fromEntries(
    MAHASANG_REPORT_COLUMN_OPTIONS.map((column) => [column.id, column.label]),
  ) as Record<MahasangReportColumnId, string>;

  const exportTemplate = createMahasangReportTemplate({
    header: header.details,
    visibleColumns,
    columnLabels: exportLabels,
    includeHeader,
  });
  const exportCsv = () => exportReportExcel(exportTemplate, rows);
  const exportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportReportPdf(exportTemplate, rows);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const hasAnyFilterApplied = isFiltered || selectedVehicleTypes.length > 0;
  const handleClearFilters = () => {
    clearFilters();
    setSelectedVehicleTypesOverride([]);
  };

  return (
    <section className="space-y-4 pb-8">
      <ReportPageShell
        title="महासंघ रिपोर्ट"
        description="वित्तीय वर्ष, शाखा, आम्दानी शीर्षक, सवारी प्रकार र मितिअनुसार सवारी बिल कारोबार, धनी/संचालक विवरण र आम्दानी हेर्नुहोस्।"
        details={header.details}
        detailsError={header.error}
        includeHeaderDetails={includeHeader}
        onIncludeHeaderDetailsChange={setIncludeHeader}
        onExportCsv={exportCsv}
        onExportPdf={() => void exportPdf()}
        isExportingPdf={isExportingPdf}
        exportDisabled={isLoading || vehiclesQuery.isLoading || Boolean(error) || rows.length === 0}
      />

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          रिपोर्ट लोड गर्न सकिएन: {error}
        </p>
      ) : null}

      {vehiclesQuery.error instanceof Error ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          सवारी मिलान विवरण लोड भएन; उपलब्ध बिलको सवारी नम्बर मात्र देखाइएको छ। ({vehiclesQuery.error.message})
        </p>
      ) : null}

      <ReportFiltersCard
        idPrefix="mahasang"
        ariaLabel="महासंघ रिपोर्ट फिल्टर"
        filters={filters}
        fiscalYears={filterOptions.fiscalYears}
        branches={filterOptions.branches}
        feeHeads={filterOptions.feeHeads}
        vehicleTypes={filterOptions.vehicleTypes}
        selectedVehicleTypes={selectedVehicleTypes}
        vehicleTypeGroups={mahasangSettings.settings?.vehicleTypeGroups ?? []}
        defaultVehicleTypes={defaultVehicleTypes}
        onVehicleTypesChange={setSelectedVehicleTypesOverride}
        isFiltered={hasAnyFilterApplied}
        onUpdate={updateFilter}
        onClear={handleClearFilters}
      />

      {!validDateRange ? (
        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          मिति दायरा मान्य छैन। सुरु मिति अन्तिम मितिभन्दा पछाडि हुन मिल्दैन।
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <ReportMetric label="सवारी बिल" value={toNepaliDigits(rows.length)} description="फिल्टर अनुसार समेटिएका बिल" />
        <ReportMetric label="सदस्यताबाट" value={`रु ${formatReportAmount(totalMembership)}`} description="भुक्तानी भएका सवारी बिलको जम्मा" />
        <ReportMetric label="अन्य आम्दानी" value={`रु ${formatReportAmount(totalOther)}`} description="सामान्य बिलिङ कारोबार जम्मा" />
      </div>

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">महासंघ कारोबार विवरण</h2>
            <p className="mt-1 text-xs text-muted-foreground">सि.नं. सधैँ देखिन्छ। मिलान अभिलेखमा भएको पुरानो गाडी नम्बर पनि देखाइन्छ।</p>
          </div>
          <MahasangReportColumnMenu visibleColumns={visibleColumns} onApply={applyColumns} />
        </div>
        <ReportDataTable
          rows={rows}
          columns={columns}
          searchableText={(row) => `${row.vehicleNumber} ${row.previousVehicleNumber} ${row.ownerName} ${row.operatorName} ${row.ownerPhone} ${row.receiptNumber} ${row.vehicleType} ${row.note}`}
          getRowId={(row) => row.id}
          isLoading={isLoading || vehiclesQuery.isLoading}
          loadingLabel="महासंघ रिपोर्ट लोड हुँदैछ..."
          emptyTitle="कारोबार भेटिएन"
          emptyDescription={hasAnyFilterApplied ? 'छानिएका फिल्टरसँग मिल्ने कारोबार उपलब्ध छैन।' : 'BillResource मा कुनै कारोबार उपलब्ध छैन।'}
        />
      </section>
    </section>
  );
}
