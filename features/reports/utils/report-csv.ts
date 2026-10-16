export type ReportCsvColumn<TRow> = {
  label: string;
  value: (row: TRow) => string | number;
};

export function reportHeaderCsvRows(details: {
  organizationName: string;
  branchName: string;
  officeAddress: string;
  reportTitle: string;
  reportDateRange: string;
  reportDateLine: string;
}): Array<[string, string]> {
  return [
    ['संघ', details.organizationName],
    ['प्रयोग भइरहेको शाखा', details.branchName],
    ['कार्यालय', details.officeAddress],
    [details.reportTitle, details.reportDateRange],
    ['मिति', details.reportDateLine],
  ];
}

function escapeCsv(value: string): string {
  const safeValue = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function downloadReportCsv<TRow>(
  rows: TRow[],
  columns: ReportCsvColumn<TRow>[],
  filename: string,
  headerRows: Array<[string, string]> = [],
): void {
  const lines = [
    ...headerRows.map((row) => row.map(escapeCsv).join(',')),
    ...(headerRows.length ? [''] : []),
    columns.map((column) => escapeCsv(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsv(String(column.value(row)))).join(',')),
  ];
  const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
