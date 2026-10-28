import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { FiscalYear } from '@/features/billing-rules/model/types';
import type { MemberListRecord, MemberResourceRecord } from '@/features/members/model/member';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';

export type MemberCounts = Record<
  'total' | 'active' | 'new' | 'inactive' | 'displaced' | 'blacklisted' | 'nonMemberBlacklisted',
  number
>;

function vehicleId(receipt: ReceiptRecord): string {
  return receipt.bill.content.vehicle.id.trim();
}

function dateValue(receipt: ReceiptRecord): number {
  const timestamp = Date.parse(receipt.bill.createdAt);
  return Number.isFinite(timestamp) ? timestamp : Date.parse(receipt.billingDate) || 0;
}

export function calculateMembers(
  receipts: ReceiptRecord[],
  fiscalYears: FiscalYear[],
  selectedFiscalYearId: string,
  displacedResources: MemberResourceRecord[],
  blacklistedVehicles: VehicleBlacklistRecord[],
): { records: MemberListRecord[]; counts: MemberCounts } {
  const latestByVehicle = new Map<string, ReceiptRecord>();
  const firstSeenByVehicle = new Map<string, number>();
  const vehiclesByYear = new Map<string, Set<string>>();
  const paidVehiclesByYear = new Map<string, Set<string>>();

  for (const receipt of receipts) {
    const id = vehicleId(receipt);
    if (!id) continue;
    const fiscalYearId = receipt.bill.content.fiscalYearId;
    const allInYear = vehiclesByYear.get(fiscalYearId) ?? new Set<string>();
    allInYear.add(id);
    vehiclesByYear.set(fiscalYearId, allInYear);
    if (receipt.status === 'PAID') {
      const paidInYear = paidVehiclesByYear.get(fiscalYearId) ?? new Set<string>();
      paidInYear.add(id);
      paidVehiclesByYear.set(fiscalYearId, paidInYear);
    }
    const current = latestByVehicle.get(id);
    if (!current || dateValue(receipt) > dateValue(current)) latestByVehicle.set(id, receipt);
    const firstSeen = firstSeenByVehicle.get(id);
    const currentDate = dateValue(receipt);
    if (firstSeen === undefined || currentDate < firstSeen) firstSeenByVehicle.set(id, currentDate);
  }

  const currentYearIds = vehiclesByYear.get(selectedFiscalYearId) ?? new Set<string>();
  const currentPaidIds = paidVehiclesByYear.get(selectedFiscalYearId) ?? new Set<string>();
  const selectedYear = fiscalYears.find((year) => year.id === selectedFiscalYearId);
  const previousYear = selectedYear
    ? fiscalYears
      .filter((year) => year.endDate < selectedYear.startDate)
      .sort((left, right) => right.endDate.localeCompare(left.endDate))[0]
    : undefined;
  const previousYearIds = previousYear
    ? vehiclesByYear.get(previousYear.id) ?? new Set<string>()
    : new Set<string>();

  const billingVehicleIds = new Set(latestByVehicle.keys());
  const tqmsBlacklistedIds = new Set(
    blacklistedVehicles.map((record) => record.vehicleId.trim()).filter(Boolean),
  );
  const memberResourceBlacklistedIds = new Set(
    displacedResources.filter((record) => record.isBlacklisted).map((record) => record.vehicleId.trim()).filter(Boolean),
  );
  const blacklistedIds = new Set(
    [...tqmsBlacklistedIds, ...memberResourceBlacklistedIds].filter((id) => billingVehicleIds.has(id)),
  );
  const allBlacklistedIds = new Set([...tqmsBlacklistedIds, ...memberResourceBlacklistedIds]);
  const nonMemberBlacklistedIds = new Set(
    [...tqmsBlacklistedIds].filter((id) => !billingVehicleIds.has(id)),
  );
  const displacedIds = new Set(
    displacedResources
      .filter((record) => record.isDisplaced)
      .map((record) => record.vehicleId.trim())
      .filter((id) => billingVehicleIds.has(id)),
  );
  const activeIds = new Set(
    [...currentPaidIds].filter((id) => !blacklistedIds.has(id) && !displacedIds.has(id)),
  );
  const newIds = new Set([...currentYearIds].filter((id) => !previousYearIds.has(id)));
  const inactiveIds = new Set(
    [...billingVehicleIds].filter((id) => (
      !activeIds.has(id) && !displacedIds.has(id) && !blacklistedIds.has(id)
    )),
  );

  const records = [...latestByVehicle.entries()].map(([id, receipt]): MemberListRecord => {
    const content = receipt.bill.content;
    const isBlacklisted = blacklistedIds.has(id);
    const isDisplaced = displacedIds.has(id);
    const isActive = activeIds.has(id);
    const isNew = newIds.has(id);
    const billingStatus = currentPaidIds.has(id)
      ? 'ACTIVE'
      : isNew
        ? 'NEW'
        : 'INACTIVE';
    const status = isBlacklisted
      ? 'BLACKLISTED'
      : isDisplaced
        ? 'DISPLACED'
        : isActive
          ? 'ACTIVE'
          : isNew
            ? 'NEW'
            : 'INACTIVE';
    return {
      vehicleId: id,
      memberNumber: '',
      vehicleNumber: content.vehicle.vehicleNumber,
      ownerName: content.vehicle.ownerName,
      sanchalakName: '',
      sawariDhaniName: content.vehicle.ownerName,
      ownerCount: 1,
      phone: content.vehicle.phone,
      address: content.vehicle.address,
      tqmsVehicleType: content.vehicle.vehicleType,
      vehicleType: content.vehicle.vehicleType,
      branchName: content.branch.name,
      branchCode: content.branch.BranchCode,
      fiscalYearId: content.fiscalYearId,
      fiscalYearName: receipt.fiscalYear || content.fiscalYearName,
      billingDate: content.billingDate,
      periodStart: content.periodStart,
      expiryDate: content.periodEnd,
      billNumber: receipt.receiptNumber,
      billIssuer: receipt.userName,
      paidAt: content.paidAt || receipt.bill.createdAt,
      totalAmount: content.total,
      isActive,
      isNew,
      isDisplaced,
      isBlacklisted,
      billingStatus,
      status,
    };
  });
  const branchSequences = new Map<string, number>();
  const orderedRecords = [...records].sort((left, right) => (
    left.branchCode.localeCompare(right.branchCode)
    || (firstSeenByVehicle.get(left.vehicleId) ?? 0) - (firstSeenByVehicle.get(right.vehicleId) ?? 0)
    || left.vehicleId.localeCompare(right.vehicleId)
  ));
  for (const record of orderedRecords) {
    const branchCode = record.branchCode.trim().toUpperCase() || 'MAIN';
    const sequence = (branchSequences.get(branchCode) ?? 0) + 1;
    branchSequences.set(branchCode, sequence);
    record.memberNumber = `ORG-${branchCode}-${String(sequence).padStart(4, '0')}`;
  }

  return {
    records,
    counts: {
      total: billingVehicleIds.size,
      active: activeIds.size,
      new: newIds.size,
      inactive: inactiveIds.size,
      displaced: displacedIds.size,
      blacklisted: allBlacklistedIds.size,
      nonMemberBlacklisted: nonMemberBlacklistedIds.size,
    },
  };
}
