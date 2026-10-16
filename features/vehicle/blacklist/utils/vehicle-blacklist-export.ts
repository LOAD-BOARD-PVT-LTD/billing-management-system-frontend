import type { ReportCsvColumn } from '@/features/reports/utils/report-csv';
import { downloadReportCsv } from '@/features/reports/utils/report-csv';
import type { VehicleBlacklistRecord } from '@/features/vehicle/blacklist';

const columns: ReportCsvColumn<VehicleBlacklistRecord>[] = [
  { label: 'सवारी नं.', value: (record) => record.vehicleNumber },
  { label: 'धनीको नाम', value: (record) => record.ownerName },
  { label: 'सवारी प्रकार', value: (record) => record.vehicleType },
  { label: 'कालोसूची', value: () => 'हो' },
  { label: 'कालोसूची कारण', value: (record) => record.blacklistedReason ?? '' },
  { label: 'कालोसूची मिति', value: (record) => record.blacklistedAt ?? '' },
  { label: 'Tags', value: (record) => record.tags.join(', ') },
];

export function exportVehicleBlacklist(records: VehicleBlacklistRecord[]): void {
  downloadReportCsv(records, columns, 'vehicle-blacklist');
}
