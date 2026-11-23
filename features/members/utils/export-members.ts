import type { MemberListRecord } from '@/features/members/model/member';
import { STATUS_LABELS } from '@/features/members/components/MemberStatusBadge';
import { organizationConfig } from '@/constants/organization';
import { exportReportExcel, type ReportExportTemplate } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

export function createMembersExportTemplate(): ReportExportTemplate<MemberListRecord> {
  return {
    id: 'members-list',
    filename: 'members',
    sheetName: 'सदस्य सूची',
    orientation: 'landscape',
    header: {
      organizationName: organizationConfig.nameNepali,
      title: 'सदस्य सूची',
    },
    columns: [
      { id: 'serial', label: 'सि.नं.', width: 30, align: 'center', pdfValue: (_r, i) => toNepaliDigits(i + 1), excelValue: (_r, i) => i + 1 },
      { id: 'memberNumber', label: 'सदस्य नं.', width: 55, pdfValue: (r) => r.memberNumber || '-' },
      { id: 'sanchalakName', label: 'संचालक', width: 90, pdfValue: (r) => r.sanchalakName || '-' },
      { id: 'sawariDhaniName', label: 'सवारी धनी', width: 95, pdfValue: (r) => r.sawariDhaniName || '-' },
      { id: 'vehicleId', label: 'सवारी ID', width: 50, pdfValue: (r) => r.vehicleId || '-' },
      { id: 'vehicleNumber', label: 'सवारी नं.', width: 75, pdfValue: (r) => r.vehicleNumber || '-' },
      { id: 'tqmsVehicleType', label: 'TQMS सवारी प्रकार', width: 65, pdfValue: (r) => r.tqmsVehicleType || '-' },
      { id: 'vehicleType', label: 'बिलिङ सवारी प्रकार', width: 65, pdfValue: (r) => r.vehicleType || '-' },
      { id: 'branchName', label: 'शाखा', width: 55, pdfValue: (r) => r.branchName || '-' },
      { id: 'status', label: 'स्थिति', width: 45, align: 'center', pdfValue: (r) => STATUS_LABELS[r.status] },
      { id: 'fiscalYearName', label: 'आर्थिक वर्ष', width: 50, align: 'center', pdfValue: (r) => r.fiscalYearName || '-' },
      { id: 'phone', label: 'सम्पर्क नं.', width: 60, pdfValue: (r) => r.phone || '-' },
    ],
    summaryFooter: (rows) => [{ label: `जम्मा सदस्य: ${toNepaliDigits(rows.length)} वटा` }],
  };
}

export function exportMembers(records: MemberListRecord[]): void {
  exportReportExcel(createMembersExportTemplate(), records);
}
