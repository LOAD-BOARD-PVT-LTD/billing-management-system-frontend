'use client';

import type { ReactNode } from 'react';
import { Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportHeader } from '@/features/reports/components/ReportHeader';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';

type ReportPageShellProps = {
  title: string;
  description: string;
  details: ReportHeaderDetails;
  detailsError?: string;
  includeHeaderDetails: boolean;
  onIncludeHeaderDetailsChange: (include: boolean) => void;
  onExportCsv: () => void;
  onExportPdf?: () => void;
  exportDisabled: boolean;
  children?: ReactNode;
};

export function ReportPageShell({
  title,
  description,
  details,
  detailsError,
  includeHeaderDetails,
  onIncludeHeaderDetailsChange,
  onExportCsv,
  onExportPdf,
  exportDisabled,
  children,
}: ReportPageShellProps) {
  return (
    <header className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800">प्रतिवेदन</span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <ReportHeader
          details={details}
          detailsError={detailsError}
          includeInExport={includeHeaderDetails}
          onIncludeInExportChange={onIncludeHeaderDetailsChange}
        />
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-sky-100 pt-3">
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={onExportCsv} disabled={exportDisabled}>
          <Download className="h-4 w-4" aria-hidden="true" />CSV मा निर्यात
        </Button>
        {onExportPdf ? (
          <Button type="button" variant="outline" size="sm" className="h-9 gap-2 bg-white" onClick={onExportPdf} disabled={exportDisabled}>
            <FileDown className="h-4 w-4" aria-hidden="true" />PDF मा निर्यात
          </Button>
        ) : null}
        {children}
      </div>
    </header>
  );
}
