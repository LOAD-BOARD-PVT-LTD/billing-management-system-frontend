import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { MemberListRecord } from '@/features/members/model/member';
import type { MemberCounts } from '@/features/members/utils/member-calculations';
import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import type { DashboardStatistics } from '@/features/dashboard/services/dashboard-statistics.service';
import type {
  BillingRecord,
  CollectionItem,
  DashboardActivity,
  DashboardMetric,
  IncomeTrendPoint,
  VehicleSegment,
} from '@/features/dashboard/data/dashboard-data';
import { convertADtoBS, formatFiscalYearForDisplay } from '@/utils/nepali-calender-dates/nepali-fiscal-year';
import { formatCurrency, toNepaliDigits } from '@/utils/numbers';

// Nepali Fiscal Year months in order: Shrawan (04) -> Ashadh (03)
const NEPALI_FISCAL_MONTHS: ReadonlyArray<{ month: number; label: string }> = [
  { month: 4, label: 'साउन' },
  { month: 5, label: 'भदौ' },
  { month: 6, label: 'असोज' },
  { month: 7, label: 'कार्तिक' },
  { month: 8, label: 'मंसिर' },
  { month: 9, label: 'पुष' },
  { month: 10, label: 'माघ' },
  { month: 11, label: 'फागुन' },
  { month: 12, label: 'चैत' },
  { month: 1, label: 'बैशाख' },
  { month: 2, label: 'जेठ' },
  { month: 3, label: 'असार' },
];

const VEHICLE_SEGMENT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#64748b'];

function toBsDateString(rawDate: string): string {
  const trimmed = rawDate.trim();
  if (!trimmed) return '';
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/u.exec(trimmed);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    if (year >= 2050) {
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
  }
  const date = new Date(`${trimmed.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return trimmed;
  try {
    return convertADtoBS(date);
  } catch {
    return trimmed;
  }
}

function getBsMonth(rawDate: string): number | null {
  const bs = toBsDateString(rawDate);
  const match = /^\d{4}[-/](\d{1,2})[-/]\d{1,2}/u.exec(bs);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  return month >= 1 && month <= 12 ? month : null;
}

export function filterReceiptsByFiscalYear(
  receipts: ReceiptRecord[],
  fiscalYear?: string,
): ReceiptRecord[] {
  const target = fiscalYear?.trim();
  if (!target || target === 'all') return receipts;
  return receipts.filter((receipt) => (
    receipt.fiscalYear === target
    || receipt.bill.content.fiscalYearId === target
    || receipt.bill.content.fiscalYearName === target
  ));
}

export function resolveMemberStatisticsWithFallback(
  apiStatistics: DashboardStatistics | null,
  fallbackCounts: MemberCounts,
): { statistics: DashboardStatistics; isFallback: boolean } {
  if (apiStatistics) {
    return { statistics: apiStatistics, isFallback: false };
  }
  return {
    isFallback: true,
    statistics: {
      members: fallbackCounts.total,
      activeMembers: fallbackCounts.active,
      newSubscriptions: fallbackCounts.new,
      inactiveMembers: fallbackCounts.inactive,
      displacedMembers: fallbackCounts.displaced,
    },
  };
}

export function buildDashboardKpiMetrics(options: {
  statistics: DashboardStatistics;
  blacklistedCount: number;
  fiscalYearReceipts: ReceiptRecord[];
}): DashboardMetric[] {
  const paidReceipts = options.fiscalYearReceipts.filter((receipt) => receipt.status === 'PAID');
  const totalIncome = paidReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);

  return [
    { title: 'कुल सदस्य', value: options.statistics.members, icon: 'members', href: '/dashboard/members' },
    { title: 'सक्रिय सदस्यहरू', value: options.statistics.activeMembers, icon: 'activeMembers', href: '/dashboard/members' },
    { title: 'नयाँ सदस्यता', value: options.statistics.newSubscriptions, icon: 'newSubscriptions', href: '/dashboard/members' },
    { title: 'निष्क्रिय सदस्यहरू', value: options.statistics.inactiveMembers, icon: 'inactiveMembers', href: '/dashboard/members' },
    { title: 'विस्थापित सदस्यहरू', value: options.statistics.displacedMembers, icon: 'displacedMembers', href: '/dashboard/members' },
    { title: 'कालोसूची सवारी', value: options.blacklistedCount, icon: 'blacklistedMembers', href: '/dashboard/vehicle-blacklist' },
    { title: 'कुल आम्दानी', value: totalIncome, icon: 'income', href: '/dashboard/income-report' },
    { title: 'भुक्तानी रसिद', value: paidReceipts.length, icon: 'vehicles', href: '/dashboard/receipts' },
  ];
}

export function buildIncomeTrendData(fiscalYearReceipts: ReceiptRecord[]): {
  points: IncomeTrendPoint[];
  totalIncome: number;
  growthPct: number | null;
} {
  const totalsByMonth = new Map<number, number>();
  let totalIncome = 0;

  for (const receipt of fiscalYearReceipts) {
    if (receipt.status !== 'PAID') continue;
    totalIncome += receipt.totalAmount;
    const date = receipt.bill.content.paidAt?.slice(0, 10) || receipt.paymentDate || receipt.billingDate;
    const bsMonth = getBsMonth(date);
    if (bsMonth !== null) {
      totalsByMonth.set(bsMonth, (totalsByMonth.get(bsMonth) ?? 0) + receipt.totalAmount);
    }
  }

  const points: IncomeTrendPoint[] = NEPALI_FISCAL_MONTHS.map(({ month, label }) => ({
    label,
    amount: totalsByMonth.get(month) ?? 0,
  }));

  const nonZeroMonths = points.filter((point) => point.amount > 0);
  let growthPct: number | null = null;
  if (nonZeroMonths.length >= 2) {
    const latest = nonZeroMonths[nonZeroMonths.length - 1].amount;
    const previous = nonZeroMonths[nonZeroMonths.length - 2].amount;
    if (previous > 0) {
      growthPct = Math.round(((latest - previous) / previous) * 1000) / 10;
    }
  }

  return { points, totalIncome, growthPct };
}

export function buildAllVehicleTypeSegments(
  members: MemberListRecord[],
  vehicles: Pick<MemberVehicleDetails, 'tqmsVehicleType'>[] = [],
): VehicleSegment[] {
  const counts = new Map<string, number>();

  if (members.length > 0) {
    for (const member of members) {
      const label = member.vehicleType?.trim() || member.tqmsVehicleType?.trim() || 'अन्य';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  } else {
    for (const vehicle of vehicles) {
      const label = vehicle.tqmsVehicleType?.trim() || 'अन्य';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], index) => ({
      label,
      count,
      share: Math.max(1, Math.round((count / total) * 100)),
      color: VEHICLE_SEGMENT_COLORS[index % VEHICLE_SEGMENT_COLORS.length],
    }));
}

export function buildVehicleBreakdownData(
  members: MemberListRecord[],
  vehicles: Pick<MemberVehicleDetails, 'tqmsVehicleType'>[] = [],
): VehicleSegment[] {
  const all = buildAllVehicleTypeSegments(members, vehicles);
  if (all.length <= 6) return all;

  const total = all.reduce((sum, item) => sum + item.count, 0);
  const top = all.slice(0, 5);
  const restCount = all.slice(5).reduce((sum, item) => sum + item.count, 0);
  if (restCount > 0) {
    top.push({
      label: 'अन्य',
      count: restCount,
      share: Math.max(1, Math.round((restCount / total) * 100)),
      color: VEHICLE_SEGMENT_COLORS[5],
    });
  }
  return top;
}

export function buildRecentBillingsData(
  fiscalYearReceipts: ReceiptRecord[],
  limit = 6,
): BillingRecord[] {
  return [...fiscalYearReceipts]
    .sort((a, b) => {
      const timeA = Date.parse(a.bill.createdAt) || Date.parse(a.billingDate) || 0;
      const timeB = Date.parse(b.bill.createdAt) || Date.parse(b.billingDate) || 0;
      return timeB - timeA;
    })
    .slice(0, limit)
    .map((receipt) => {
      const serviceTitles = receipt.bill.content.items.map((item) => item.title).filter(Boolean);
      const service = serviceTitles.length > 1
        ? `${serviceTitles[0]} (+${toNepaliDigits(serviceTitles.length - 1)})`
        : serviceTitles[0] || (receipt.billingType === 'GENERAL' ? 'सामान्य बिल' : 'सदस्यता शुल्क');

      return {
        invoice: toNepaliDigits(receipt.receiptNumber),
        member: receipt.customerName || receipt.vehicleNumber || '—',
        service,
        amount: receipt.totalAmount,
        date: toNepaliDigits(toBsDateString(receipt.billingDate).replaceAll('-', '/')),
        status: receipt.status === 'CANCELLED' ? 'overdue' : receipt.status === 'PENDING' ? 'pending' : 'paid',
      };
    });
}

export function buildCollectionSummaryData(
  fiscalYearReceipts: ReceiptRecord[],
  limit = 6,
): CollectionItem[] {
  const byTitle = new Map<string, number>();
  let grandTotal = 0;

  for (const receipt of fiscalYearReceipts) {
    if (receipt.status !== 'PAID') continue;
    for (const item of receipt.bill.content.items) {
      const label = item.title?.trim() || 'अन्य शुल्क';
      byTitle.set(label, (byTitle.get(label) ?? 0) + item.amount);
      grandTotal += item.amount;
    }
  }

  if (grandTotal <= 0) return [];

  return Array.from(byTitle.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, amount]) => ({
      label,
      amount,
      share: Math.max(1, Math.min(100, Math.round((amount / grandTotal) * 100))),
    }));
}

export function buildPaymentMethodSummaryData(
  fiscalYearReceipts: ReceiptRecord[],
): CollectionItem[] {
  const byMethod = new Map<string, number>();
  let grandTotal = 0;

  for (const receipt of fiscalYearReceipts) {
    if (receipt.status !== 'PAID') continue;
    const label = receipt.paymentMethod?.trim() || 'नगद';
    byMethod.set(label, (byMethod.get(label) ?? 0) + receipt.totalAmount);
    grandTotal += receipt.totalAmount;
  }

  if (grandTotal <= 0) return [];

  return Array.from(byMethod.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({
      label,
      amount,
      share: Math.max(1, Math.min(100, Math.round((amount / grandTotal) * 100))),
    }));
}

export function buildSystemActivityData(options: {
  fiscalYearReceipts: ReceiptRecord[];
  inactiveCount: number;
  blacklistedCount: number;
  fiscalYear: string;
}): DashboardActivity[] {
  const activities: DashboardActivity[] = [];
  const sorted = [...options.fiscalYearReceipts].sort((a, b) => {
    const timeA = Date.parse(a.bill.createdAt) || Date.parse(a.billingDate) || 0;
    const timeB = Date.parse(b.bill.createdAt) || Date.parse(b.billingDate) || 0;
    return timeB - timeA;
  });

  for (const receipt of sorted.slice(0, 3)) {
    const dateLabel = toNepaliDigits(toBsDateString(receipt.billingDate).replaceAll('-', '/'));
    if (receipt.status === 'CANCELLED') {
      activities.push({
        title: `रसिद रद्द भयो (${toNepaliDigits(receipt.receiptNumber)})`,
        detail: `${receipt.customerName || receipt.vehicleNumber} · रु ${formatCurrency(receipt.totalAmount)}`,
        time: dateLabel,
        state: 'warning',
      });
    } else {
      activities.push({
        title: `बिल जारी भयो (${toNepaliDigits(receipt.receiptNumber)})`,
        detail: `${receipt.customerName || receipt.vehicleNumber} · रु ${formatCurrency(receipt.totalAmount)}`,
        time: dateLabel,
        state: 'success',
      });
    }
  }

  if (options.inactiveCount > 0) {
    activities.push({
      title: 'निष्क्रिय सदस्य अनुगमन आवश्यक',
      detail: `आर्थिक वर्ष ${formatFiscalYearForDisplay(options.fiscalYear)} मा ${toNepaliDigits(options.inactiveCount)} सदस्य निष्क्रिय छन्`,
      time: 'हालको अवस्था',
      state: 'warning',
    });
  }

  if (options.blacklistedCount > 0) {
    activities.push({
      title: 'कालोसूचीमा रहेका सवारी',
      detail: `${toNepaliDigits(options.blacklistedCount)} सवारी कालोसूचीमा सूचीकृत छन्`,
      time: 'हालको अवस्था',
      state: 'info',
    });
  }

  return activities.slice(0, 5);
}
