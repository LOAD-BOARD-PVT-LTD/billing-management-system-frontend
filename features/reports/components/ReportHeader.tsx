'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/contexts/organization-context';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';

type ReportHeaderProps = {
  details: ReportHeaderDetails;
  includeInExport: boolean;
  onIncludeInExportChange: (include: boolean) => void;
  detailsError?: string;
};

export function ReportHeader({
  details,
  includeInExport,
  onIncludeInExportChange,
  detailsError,
}: ReportHeaderProps) {
  const { organization } = useOrganization();

  return (
    <aside className="min-w-0 text-sm leading-6 xl:max-w-xl" aria-label="रिपोर्टको शीर्षक विवरण">
      <p className="font-medium text-foreground">{details.organizationName || organization.nameNepali}</p>
      <p className="text-muted-foreground">प्रयोग भइरहेको शाखा: {details.branchName}</p>
      <p className="text-muted-foreground">कार्यालय: {details.officeAddress}</p>
      <p className="text-muted-foreground">{details.reportTitle} ({details.reportDateRange})</p>
      <p className="font-medium text-foreground">मिति: {details.reportDateLine}</p>
      {detailsError ? <p className="text-xs text-destructive">{detailsError}</p> : null}
      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-normal text-foreground">
        <Checkbox
          checked={includeInExport}
          onCheckedChange={(checked) => onIncludeInExportChange(checked === true)}
        />
        रिपोर्ट बनाउने विवरण छान्नुहोस्
      </label>
    </aside>
  );
}