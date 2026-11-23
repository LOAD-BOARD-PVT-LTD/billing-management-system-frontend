import { organizationConfig } from '@/constants/organization';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';
import { exportReportExcel, type ReportExportTemplate } from '@/shared/report-export';
import { toNepaliDigits } from '@/utils/numbers';

export function createVehicleBlacklistExportTemplate(): ReportExportTemplate<VehicleBlacklistRecord> {
  return {
    id: 'vehicle-blacklist',
    filename: 'vehicle-blacklist',
    sheetName: 'सवारी कालोसूची',
    orientation: 'landscape',
    header: {
      organizationName: organizationConfig.nameNepali,
      title: 'सवारी कालोसूची विवरण',
    },
    columns: [
      { id: 'serial', label: 'सि.नं.', width: 32, align: 'center', pdfValue: (_r, i) => toNepaliDigits(i + 1), excelValue: (_r, i) => i + 1 },
      { id: 'vehicleNumber', label: 'सवारी नं.', width: 85, pdfValue: (r) => r.vehicleNumber || '-' },
      { id: 'ownerName', label: 'धनीको नाम', width: 110, pdfValue: (r) => r.ownerName || '-' },
      { id: 'vehicleType', label: 'सवारी प्रकार', width: 65, pdfValue: (r) => r.vehicleType || '-' },
      { id: 'blacklisted', label: 'कालोसूची', width: 45, align: 'center', pdfValue: () => 'हो' },
      { id: 'reason', label: 'कालोसूची कारण', width: 120, pdfValue: (r) => r.blacklistedReason ?? '-' },
      { id: 'blacklistedAt', label: 'कालोसूची मिति', width: 70, align: 'center', pdfValue: (r) => r.blacklistedAt ?? '-' },
      { id: 'tags', label: 'Tags', width: 80, pdfValue: (r) => r.tags.join(', ') || '-' },
    ],
    summaryFooter: (rows) => [{ label: `जम्मा कालोसूची सवारी: ${toNepaliDigits(rows.length)} वटा` }],
  };
}

export function exportVehicleBlacklist(records: VehicleBlacklistRecord[]): void {
  exportReportExcel(createVehicleBlacklistExportTemplate(), records);
}
