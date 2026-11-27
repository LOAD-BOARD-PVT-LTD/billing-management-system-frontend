import type { BranchRecord } from '@/features/administration/branches/types/branch.types';
import type { UserRecord } from '@/features/administration/users/types/user.types';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { ReportFilterOption } from '@/features/reports/components/ReportFiltersCard';
import type { IncomeReportFilters } from '@/features/reports/types/income-report';
import { hasValidIncomeReportDateRange } from '@/features/reports/utils/income-report-filters';
import {
  buildReportBranchOptions,
  buildReportFeeHeadOptions,
  buildReportFiscalYearOptions,
} from '@/features/reports/utils/report-filter-options';
import { normalizeReportKey } from '@/features/reports/utils/report-format';
import type { MahasangReportSettings } from '@/features/settings/api/mahasang-report-settings.api';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import type { User } from '@/types/auth';

export interface MahasangReportFilterValues extends IncomeReportFilters {
  vehicleTypes: string[];
}

function normalizeBranchKey(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeOptionText(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

export function buildMahasangFilterOptions(params: {
  receipts: readonly ReceiptRecord[];
  systemBranches?: readonly (Pick<BranchRecord, 'name'> & { id?: string })[];
  billingRuleFeeHeads?: readonly { id: string; title?: string; name?: string; fiscalYearId?: string | null }[];
  fiscalYears?: readonly Pick<FiscalYear, 'id' | 'name' | 'code'>[];
  selectedFiscalYear?: string;
  authUser?: Pick<User, 'id' | 'email' | 'name' | 'role'> | null;
  systemUsers?: readonly Pick<UserRecord, 'id' | 'email' | 'name' | 'branchId' | 'branchName'>[];
  vehicleTypeRecords?: readonly Pick<VehicleTypeRecord, 'vehicleTypes'>[];
  memberVehicles?: readonly Pick<MemberVehicleDetails, 'tqmsVehicleType'>[];
  settings?: MahasangReportSettings | null;
}): {
  fiscalYears: string[];
  branches: string[];
  feeHeads: ReportFilterOption[];
  vehicleTypes: string[];
} {
  const {
    receipts,
    systemBranches = [],
    billingRuleFeeHeads = [],
    fiscalYears: configuredFiscalYears = [],
    selectedFiscalYear = 'all',
    authUser,
    systemUsers = [],
    vehicleTypeRecords = [],
    memberVehicles = [],
    settings,
  } = params;

  const fiscalYears = buildReportFiscalYearOptions({
    fiscalYears: configuredFiscalYears,
    receipts,
  });

  const branches = buildReportBranchOptions({
    receipts,
    systemBranches: systemBranches.map((branch) => ({ id: branch.id ?? '', name: branch.name })),
    authUser,
    systemUsers,
  });

  const feeHeads = buildReportFeeHeadOptions({
    billingRuleFeeHeads,
    fiscalYears: configuredFiscalYears,
    receipts,
    selectedFiscalYear,
  });

  const vehicleTypeByKey = new Map<string, string>();
  const addVehicleType = (raw: string | null | undefined) => {
    const trimmed = normalizeOptionText(raw);
    if (!trimmed || trimmed === '—' || trimmed === 'सवारी प्रकार उपलब्ध छैन') return;
    const key = normalizeReportKey(trimmed);
    if (key && !vehicleTypeByKey.has(key)) {
      vehicleTypeByKey.set(key, trimmed);
    }
  };

  for (const category of vehicleTypeRecords) {
    for (const typeName of category.vehicleTypes) addVehicleType(typeName);
  }
  for (const vehicle of memberVehicles) {
    addVehicleType(vehicle.tqmsVehicleType);
  }
  for (const receipt of receipts) {
    addVehicleType(receipt.bill.content.vehicle.vehicleType);
  }
  for (const typeName of settings?.defaultVehicleTypes ?? []) {
    addVehicleType(typeName);
  }
  for (const group of settings?.vehicleTypeGroups ?? []) {
    for (const typeName of group.vehicleTypes) addVehicleType(typeName);
  }

  const vehicleTypes = Array.from(vehicleTypeByKey.values()).sort((left, right) =>
    left.localeCompare(right, 'ne'),
  );

  return { fiscalYears, branches, feeHeads, vehicleTypes };
}

export function filterMahasangReceipts(
  receipts: readonly ReceiptRecord[],
  filters: MahasangReportFilterValues,
): ReceiptRecord[] {
  if (!hasValidIncomeReportDateRange(filters)) return [];

  const selectedVehicleKeys = new Set(
    filters.vehicleTypes.map((item) => normalizeReportKey(item)).filter(Boolean),
  );
  const branchKey = filters.branch === 'all' ? '' : normalizeBranchKey(filters.branch);
  const feeHeadKey = filters.feeHead === 'all' ? '' : normalizeReportKey(filters.feeHead);

  return receipts.filter((receipt) => {
    if (filters.fiscalYear !== 'all' && receipt.fiscalYear !== filters.fiscalYear) {
      return false;
    }

    if (branchKey && normalizeBranchKey(receipt.branchName) !== branchKey) {
      return false;
    }

    if (feeHeadKey) {
      const hasFeeHead = receipt.bill.content.items.some(
        (item) => item.feeHeadId === filters.feeHead || normalizeReportKey(item.title) === feeHeadKey,
      );
      if (!hasFeeHead) return false;
    }

    if (selectedVehicleKeys.size > 0) {
      const receiptVehicleKey = normalizeReportKey(receipt.bill.content.vehicle.vehicleType);
      if (!receiptVehicleKey || !selectedVehicleKeys.has(receiptVehicleKey)) {
        return false;
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateBasis === 'billingDate') {
        const periodStart = receipt.bill.content.periodStart || receipt.billingDate;
        const periodEnd = receipt.bill.content.periodEnd || receipt.validUntil || periodStart;
        if (filters.dateFrom && (!periodEnd || periodEnd < filters.dateFrom)) {
          return false;
        }
        if (filters.dateTo && (!periodStart || periodStart > filters.dateTo)) {
          return false;
        }
      } else {
        const paymentDate = receipt.paymentDate || receipt.billingDate;
        if (filters.dateFrom && (!paymentDate || paymentDate < filters.dateFrom)) {
          return false;
        }
        if (filters.dateTo && (!paymentDate || paymentDate > filters.dateTo)) {
          return false;
        }
      }
    }

    return true;
  });
}
