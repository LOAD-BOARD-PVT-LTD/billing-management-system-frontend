import { organizationConfig } from '@/constants/organization';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';

export function createReportHeaderDetails(
  details: Omit<ReportHeaderDetails, 'organizationName'>,
  organizationName: string = organizationConfig.nameNepali,
): ReportHeaderDetails {
  return {
    ...details,
    organizationName,
  };
}
