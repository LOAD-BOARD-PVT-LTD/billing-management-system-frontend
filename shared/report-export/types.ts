export type ReportExportOrientation = 'landscape' | 'portrait';
export type ReportCellAlign = 'left' | 'center' | 'right';

export interface ReportHeaderMetaPair {
  label: string;
  value: string;
}

export interface ReportExportHeader {
  organizationName: string;
  subtitle?: string;
  title: string;
  leftMeta?: string;
  rightMeta?: string;
  continuationLine?: string;
  metaPairs?: ReportHeaderMetaPair[];
}

export interface ReportSummaryBox {
  label: string;
  value?: string;
  widthWeight?: number;
}

export interface ReportExportColumn<TRow> {
  id: string;
  label: string;
  group?: string;
  width: number;
  align?: ReportCellAlign;
  pdfValue: (row: TRow, index: number) => string | string[];
  excelValue?: (row: TRow, index: number) => string | number;
}

export interface ReportExportTemplate<TRow> {
  id: string;
  filename: string;
  sheetName?: string;
  orientation?: ReportExportOrientation;
  header: ReportExportHeader;
  includeHeader?: boolean;
  columns: ReportExportColumn<TRow>[];
  summaryFooter?: (rows: TRow[]) => ReportSummaryBox[];
  emptyMessage?: string;
}

export type ReportAssetLoader = (assetPath: string, name: string) => Promise<Uint8Array>;
