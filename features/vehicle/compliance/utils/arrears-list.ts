import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import { normalizeVehicleNumber } from '@/features/vehicle/blacklist/utils/dedupe-vehicle-blacklist';
import {
  bikramSambatToGregorian,
  parseBikramSambatDate,
} from '@/utils/nepali-calender-dates/nepali-date';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';

export type ArrearsView = 'membership' | 'neverBilled' | 'paidExpired' | 'monthlyPaid'
  | 'insurance' | 'bluebook' | 'routePermit' | 'checkPass';

export interface ArrearsListRow {
  key: string;
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  operatorName: string;
  phone: string;
  receiptNumber: string;
  billingDate: string;
  expiryDate: string;
  vehicle?: MemberVehicleDetails;
  receipt?: ReceiptRecord;
}

interface ArrearsListOptions {
  view: ArrearsView;
  vehicles: MemberVehicleDetails[];
  receipts: ReceiptRecord[];
  paidExpiredRuleId: string;
  monthlyFiscalYearId: string;
  monthlyRuleId: string;
  branchFilter?: string;
}

function isDocumentView(view: ArrearsView): view is Extract<
  ArrearsView,
  'insurance' | 'bluebook' | 'routePermit' | 'checkPass'
> {
  return view === 'insurance' || view === 'bluebook' || view === 'routePermit' || view === 'checkPass';
}

function normalizedNumber(value: string): string {
  return normalizeVehicleNumber(value);
}

function identityKeys(vehicleId: string, vehicleNumber: string): string[] {
  const keys: string[] = [];
  if (vehicleId.trim()) keys.push(`id:${vehicleId.trim().toLocaleLowerCase()}`);
  const number = normalizedNumber(vehicleNumber);
  if (number) keys.push(`number:${number}`);
  return keys;
}

function receiptDate(receipt: ReceiptRecord): number {
  const date = Date.parse(receipt.bill.createdAt || receipt.billingDate);
  return Number.isFinite(date) ? date : 0;
}

function isExpired(value: string): boolean {
  if (!value) return false;
  const western = value.replace(/[०-९]/g, (digit) => String('०१२३४५६७८९'.indexOf(digit)));
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(western);
  let date: Date | null = null;
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const adDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (adDate.getFullYear() === Number(year) && adDate.getMonth() === Number(month) - 1 && adDate.getDate() === Number(day)) {
      date = adDate;
    } else {
      try {
        const parts = parseBikramSambatDate(western);
        date = parts ? bikramSambatToGregorian(parts) : null;
      } catch {
        date = null;
      }
    }
  } else {
    const parsed = new Date(western);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!date) return false;
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function rowFromReceipt(
  receipt: ReceiptRecord,
  vehicleById: Map<string, MemberVehicleDetails>,
  vehicleByNumber: Map<string, MemberVehicleDetails>,
): ArrearsListRow {
  const content = receipt.bill.content;
  const vehicle = vehicleById.get(content.vehicle.id.trim())
    ?? vehicleByNumber.get(normalizedNumber(content.vehicle.vehicleNumber));
  return {
    key: `${receipt.id}:${content.vehicle.id || content.vehicle.vehicleNumber}`,
    vehicleNumber: vehicle?.vehicleNumber || content.vehicle.vehicleNumber,
    vehicleType: vehicle?.tqmsVehicleType || content.vehicle.vehicleType,
    ownerName: vehicle?.sawariDhaniName || content.vehicle.ownerName,
    operatorName: vehicle?.sanchalakName || content.vehicle.operatorName || '',
    phone: vehicle?.phone || content.vehicle.phone,
    receiptNumber: receipt.receiptNumber,
    billingDate: content.billingDate || receipt.billingDate,
    expiryDate: content.periodEnd || receipt.validUntil,
    vehicle,
    receipt,
  };
}

function latestByVehicle(receipts: ReceiptRecord[]): ReceiptRecord[] {
  const latest = new Map<string, ReceiptRecord>();
  for (const receipt of receipts) {
    const content = receipt.bill.content;
    const keys = identityKeys(content.vehicle.id, content.vehicle.vehicleNumber);
    const key = keys[0] ?? keys[1];
    if (!key) continue;
    const previous = latest.get(key);
    if (!previous || receiptDate(receipt) > receiptDate(previous)) latest.set(key, receipt);
  }
  return [...latest.values()];
}

export function getArrearsListRows(options: ArrearsListOptions): ArrearsListRow[] {
  const view = options.view;
  const vehicleById = new Map(options.vehicles.map((vehicle) => [vehicle.vehicleId.trim(), vehicle]));
  const vehicleByNumber = new Map(options.vehicles.map((vehicle) => [normalizedNumber(vehicle.vehicleNumber), vehicle]));
  const membershipReceipts = options.receipts.filter((receipt) => {
    if (receipt.billingType !== 'MEMBERSHIP' || receipt.status !== 'PAID') return false;
    if (!options.branchFilter) return true;
    const vehicle = vehicleById.get(receipt.bill.content.vehicle.id.trim())
      ?? vehicleByNumber.get(normalizedNumber(receipt.bill.content.vehicle.vehicleNumber));
    return vehicle
      ? matchesTqmsSanghBranch(vehicle.branch, options.branchFilter)
      : matchesTqmsSanghBranch(receipt.bill.content.branch.name, options.branchFilter);
  });
  const toRow = (receipt: ReceiptRecord) => rowFromReceipt(receipt, vehicleById, vehicleByNumber);

  if (view === 'neverBilled') {
    const billedKeys = new Set(membershipReceipts.flatMap((receipt) => identityKeys(
      receipt.bill.content.vehicle.id,
      receipt.bill.content.vehicle.vehicleNumber,
    )));
    return options.vehicles
      .filter((vehicle) => !identityKeys(vehicle.vehicleId, vehicle.vehicleNumber).some((key) => billedKeys.has(key)))
      .map((vehicle) => ({
        key: `vehicle:${vehicle.vehicleId}`,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.tqmsVehicleType,
        ownerName: vehicle.sawariDhaniName,
        operatorName: vehicle.sanchalakName,
        phone: vehicle.phone,
        receiptNumber: '',
        billingDate: '',
        expiryDate: '',
        vehicle,
      }));
  }

  if (view === 'membership') {
    return latestByVehicle(membershipReceipts).map(toRow);
  }

  if (view === 'paidExpired') {
    if (!options.paidExpiredRuleId) return [];
    return latestByVehicle(membershipReceipts.filter((receipt) => (
      receipt.bill.content.items.some((item) => item.ruleId === options.paidExpiredRuleId)
    )))
      .filter((receipt) => isExpired(receipt.bill.content.periodEnd || receipt.validUntil))
      .map(toRow);
  }

  if (view === 'monthlyPaid') {
    if (!options.monthlyFiscalYearId || !options.monthlyRuleId) return [];
    return latestByVehicle(membershipReceipts.filter((receipt) => (
      receipt.bill.content.fiscalYearId === options.monthlyFiscalYearId
      && receipt.bill.content.items.some((item) => item.ruleId === options.monthlyRuleId)
    ))).map(toRow);
  }

  if (!isDocumentView(view)) return [];

  return options.vehicles.map((vehicle) => ({
    key: `vehicle:${vehicle.vehicleId}`,
    vehicleNumber: vehicle.vehicleNumber,
    vehicleType: vehicle.tqmsVehicleType,
    ownerName: vehicle.sawariDhaniName,
    operatorName: vehicle.sanchalakName,
    phone: vehicle.phone,
    receiptNumber: '',
    billingDate: '',
    expiryDate: vehicle.compliance[view].expiryBs || vehicle.compliance[view].expiryAd,
    vehicle,
  }));
}
