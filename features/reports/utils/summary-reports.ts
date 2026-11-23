import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import type { FeeHeadSummaryRow, MahasangReportRow, VehicleCategorySummaryRow } from '@/features/reports/types/summary-reports';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { normalizeReportKey } from '@/features/reports/utils/report-format';

export function buildFeeHeadSummary(receipts: ReceiptRecord[]): FeeHeadSummaryRow[] {
  const groups = new Map<string, FeeHeadSummaryRow & { receiptIds: Set<string> }>();
  receipts.forEach((receipt) => {
    receipt.bill.content.items.forEach((item) => {
      const key = item.feeHeadId || item.title || 'unknown';
      const group = groups.get(key) ?? {
        id: key,
        feeHeadId: item.feeHeadId || '—',
        feeTitle: item.title || 'शीर्षक उपलब्ध छैन',
        transactionCount: 0,
        itemCount: 0,
        amount: 0,
        receiptIds: new Set<string>(),
      };
      group.itemCount += 1;
      if (receipt.status === 'PAID') group.amount += item.amount;
      group.receiptIds.add(receipt.id);
      groups.set(key, group);
    });
  });
  return Array.from(groups.values())
    .map(({ receiptIds, ...row }) => ({ ...row, transactionCount: receiptIds.size }))
    .sort((first, second) => first.feeTitle.localeCompare(second.feeTitle, 'ne'));
}

function categoryForVehicleType(vehicleType: string, categories: VehicleTypeRecord[]): string {
  const typeKey = normalizeReportKey(vehicleType);
  if (!typeKey) return 'वर्ग उपलब्ध छैन';
  return categories.find((category) => category.vehicleTypes.some((type) => normalizeReportKey(type) === typeKey))?.category
    ?? 'वर्गीकृत नभएको';
}

export function buildVehicleCategorySummary(
  receipts: ReceiptRecord[],
  categories: VehicleTypeRecord[],
): VehicleCategorySummaryRow[] {
  const groups = new Map<string, VehicleCategorySummaryRow & { vehicles: Set<string>; receipts: Set<string> }>();
  receipts.forEach((receipt) => {
    const category = categoryForVehicleType(receipt.bill.content.vehicle.vehicleType, categories);
    const group = groups.get(category) ?? {
      id: category,
      category,
      vehicleCount: 0,
      transactionCount: 0,
      amount: 0,
      vehicles: new Set<string>(),
      receipts: new Set<string>(),
    };
    const vehicleKey = normalizeReportKey(receipt.vehicleNumber) || receipt.id;
    group.vehicles.add(vehicleKey);
    if (!group.receipts.has(receipt.id)) {
      group.receipts.add(receipt.id);
      if (receipt.status === 'PAID') group.amount += receipt.totalAmount;
    }
    groups.set(category, group);
  });
  return Array.from(groups.values())
    .map(({ vehicles, receipts: receiptIds, ...row }) => ({
      ...row,
      vehicleCount: vehicles.size,
      transactionCount: receiptIds.size,
    }))
    .sort((first, second) => first.category.localeCompare(second.category, 'ne'));
}

export function buildMahasangRows(
  receipts: ReceiptRecord[],
  vehicles: Pick<MemberVehicleDetails, 'vehicleId' | 'vehicleNumber' | 'previousVehicleIds' | 'previousVehicleNumbers'>[] = [],
): MahasangReportRow[] {
  const vehiclesById = new Map<string, typeof vehicles[number]>();
  const vehiclesByPreviousId = new Map<string, typeof vehicles[number]>();
  const vehiclesByNumber = new Map<string, typeof vehicles[number]>();
  const vehiclesByPreviousNumber = new Map<string, typeof vehicles[number]>();
  for (const vehicle of vehicles) {
    const vehicleId = vehicle.vehicleId.trim().toLocaleLowerCase();
    const vehicleNumber = normalizeReportKey(vehicle.vehicleNumber);
    if (vehicleId) vehiclesById.set(vehicleId, vehicle);
    if (vehicleNumber) vehiclesByNumber.set(vehicleNumber, vehicle);
    for (const previousId of vehicle.previousVehicleIds ?? []) {
      const key = previousId.trim().toLocaleLowerCase();
      if (key) vehiclesByPreviousId.set(key, vehicle);
    }
    for (const previousNumber of vehicle.previousVehicleNumbers ?? []) {
      const key = normalizeReportKey(previousNumber);
      if (key) vehiclesByPreviousNumber.set(key, vehicle);
    }
  }

  return receipts.map((receipt) => {
    const bill = receipt.bill.content;
    const snapshotVehicleNumber = bill.vehicle.vehicleNumber || receipt.vehicleNumber;
    const vehicleId = bill.vehicle.id.trim().toLocaleLowerCase();
    const normalizedVehicleNumber = normalizeReportKey(snapshotVehicleNumber);
    const currentVehicle = vehiclesByPreviousId.get(vehicleId)
      ?? vehiclesByPreviousNumber.get(normalizedVehicleNumber)
      ?? vehiclesById.get(vehicleId)
      ?? vehiclesByNumber.get(normalizedVehicleNumber);
    const currentVehicleNumber = currentVehicle?.vehicleNumber || snapshotVehicleNumber;
    const previousVehicleNumber = normalizeReportKey(snapshotVehicleNumber) !== normalizeReportKey(currentVehicleNumber)
      ? snapshotVehicleNumber
      : currentVehicle?.previousVehicleNumbers?.at(-1) || '—';
    const total = receipt.status === 'PAID' ? receipt.totalAmount : 0;
    return {
      id: receipt.id,
      vehicleNumber: currentVehicleNumber,
      previousVehicleNumber,
      vehicleType: bill.vehicle.vehicleType || '—',
      ownerName: receipt.customerName || bill.vehicle.ownerName || '—',
      operatorName: receipt.billingType === 'MEMBERSHIP' ? bill.vehicle.operatorName || '' : '',
      ownerPhone: receipt.customerPhone || bill.vehicle.smsPhone || bill.vehicle.phone || '—',
      note: bill.note || '—',
      receiptNumber: receipt.receiptNumber,
      membershipIncome: receipt.billingType === 'MEMBERSHIP' ? total : 0,
      otherIncome: receipt.billingType === 'GENERAL' ? total : 0,
      total,
      periodMonths: bill.billingMonths,
      paymentMethod: bill.paymentMethod || '—',
      billingDate: bill.billingDate,
      periodStart: bill.periodStart,
      periodEnd: bill.periodEnd,
    };
  });
}
