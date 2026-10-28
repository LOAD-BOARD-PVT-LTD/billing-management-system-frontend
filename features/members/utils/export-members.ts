import type { MemberListRecord } from '@/features/members/model/member';
import { STATUS_LABELS } from '@/features/members/components/MemberStatusBadge';

export function exportMembers(records: MemberListRecord[]): void {
  const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const headers = ['सदस्य नं.', 'सञ्चालक', 'सवारी धनी', 'सवारी ID', 'सवारी नं.', 'TQMS सवारी प्रकार', 'बिलिङ सवारी प्रकार', 'शाखा', 'स्थिति', 'आर्थिक वर्ष', 'सम्पर्क नं.'];
  const rows = records.map((record) => [
    record.memberNumber,
    record.sanchalakName,
    record.sawariDhaniName,
    record.vehicleId,
    record.vehicleNumber,
    record.tqmsVehicleType,
    record.vehicleType,
    record.branchName,
    STATUS_LABELS[record.status],
    record.fiscalYearName,
    record.phone,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'members.csv';
  link.click();
  URL.revokeObjectURL(url);
}
