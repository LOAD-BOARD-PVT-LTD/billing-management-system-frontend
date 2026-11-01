import type { MemberListRecord } from '@/features/members/model/member';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { MemberTransactionRow } from '@/features/reports/types/summary-reports';
import type { TqmsRegistryVehicle } from '@/features/vehicle/tqms/model/tqms-member-registry';
import { normalizeReportKey } from '@/features/reports/utils/report-format';
import { toEnglishDigits } from '@/utils/numbers';

export type MemberTransactionCandidate = {
  id: string;
  vehicleNumber: string;
  memberNumber: string;
  ownerName: string;
  phone: string;
  address: string;
  vehicleType: string;
  branchName: string;
  transactions: MemberTransactionRow[];
};

function firstValue(...values: Array<string | null | undefined>): string {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? '';
}

function normalizeSearchValue(value: string): string {
  return normalizeReportKey(toEnglishDigits(value)).replace(/[^\p{L}\p{N}]/gu, '');
}

export function buildMemberTransactionCandidates(
  receipts: ReceiptRecord[],
  registryVehicles: TqmsRegistryVehicle[],
  members: MemberListRecord[],
): MemberTransactionCandidate[] {
  const registryByVehicle = new Map(
    registryVehicles.map((vehicle) => [normalizeReportKey(vehicle.vehicleNumber), vehicle]),
  );
  const membersByVehicle = new Map(
    members.map((member) => [normalizeReportKey(member.vehicleNumber), member]),
  );
  const grouped = new Map<string, ReceiptRecord[]>();

  receipts
    .filter((receipt) => receipt.billingType === 'MEMBERSHIP' && normalizeReportKey(receipt.vehicleNumber))
    .forEach((receipt) => {
      const key = normalizeReportKey(receipt.vehicleNumber);
      const vehicleReceipts = grouped.get(key) ?? [];
      vehicleReceipts.push(receipt);
      grouped.set(key, vehicleReceipts);
    });

  return Array.from(grouped.entries()).map(([id, vehicleReceipts]) => {
    const firstReceipt = vehicleReceipts[0];
    const registry = registryByVehicle.get(id);
    const member = membersByVehicle.get(id);
    return {
      id,
      vehicleNumber: toEnglishDigits(firstValue(member?.vehicleNumber, registry?.vehicleNumber, firstReceipt.vehicleNumber)),
      memberNumber: firstValue(member?.memberNumber),
      ownerName: firstValue(member?.ownerName, registry?.vehicleOwnerName, firstReceipt.customerName),
      phone: toEnglishDigits(firstValue(member?.phone, registry?.phone, firstReceipt.customerPhone, firstReceipt.bill.content.vehicle.phone)),
      address: firstValue(member?.address, registry?.address, firstReceipt.bill.content.vehicle.address),
      vehicleType: firstValue(member?.vehicleType, registry?.vehicleType, firstReceipt.bill.content.vehicle.vehicleType),
      branchName: firstValue(member?.branchName, registry?.branch, firstReceipt.branchName),
      transactions: vehicleReceipts.map((receipt) => ({
        id: receipt.id,
        receipt,
        feeTitles: receipt.bill.content.items.map((item) => item.title).filter(Boolean).join(', ') || '—',
        phone: firstValue(receipt.customerPhone, receipt.bill.content.vehicle.phone) || '—',
        memberNumber: firstValue(member?.memberNumber) || '—',
        previousVehicleNumber: '—',
      })),
    };
  }).sort((first, second) => first.vehicleNumber.localeCompare(second.vehicleNumber, 'ne'));
}

export function searchMemberTransactionCandidates(
  candidates: MemberTransactionCandidate[],
  query: string,
): MemberTransactionCandidate[] {
  const search = normalizeSearchValue(query);
  if (!search) return [];
  return candidates.filter((candidate) => {
    const values = [
      candidate.vehicleNumber,
      candidate.memberNumber,
      candidate.ownerName,
      candidate.phone,
      candidate.address,
      candidate.vehicleType,
      candidate.branchName,
      ...candidate.transactions.flatMap(({ receipt, feeTitles }) => [
        receipt.receiptNumber,
        receipt.branchName,
        receipt.paymentMethod,
        receipt.customerName,
        feeTitles,
      ]),
    ];
    return values.some((value) => normalizeSearchValue(value).includes(search));
  });
}
