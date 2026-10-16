import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { IncomeReportRow } from '@/features/reports/types/income-report';
import type { IncomeReportColumnId } from '@/features/reports/utils/income-report-columns';
import type { ReportHeaderDetails } from '@/features/reports/types/report-header';
import { formatCurrency } from '@/utils/numbers';

export function mapIncomeReportRows(receipts: ReceiptRecord[]): IncomeReportRow[] {
  return receipts.flatMap((receipt) => {
    const items = receipt.bill.content.items;
    const paymentDate = receipt.bill.content.paidAt?.slice(0, 10) || receipt.paymentDate;

    return items.map((item, index) => ({
      id: `${receipt.id}-${index}`,
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      paymentDate,
      billingDate: receipt.billingDate,
      customerName: receipt.customerName,
      vehicleNumber: receipt.vehicleNumber,
      vehicleType: receipt.bill.content.vehicle.vehicleType,
      branchName: receipt.branchName,
      userName: receipt.userName,
      fiscalYear: receipt.fiscalYear,
      paymentMethod: receipt.paymentMethod,
      feeHeadId: item.feeHeadId,
      feeTitle: item.title,
      billingEntity: item.billingEntity,
      amount: item.amount,
      receiptTotal: receipt.totalAmount,
      status: receipt.status,
    }));
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return character;
    }
  });
}

function csvCell(value: string): string {
  const safeValue = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function downloadIncomeReportCsv(
  rows: IncomeReportRow[],
  fileLabel: string,
  visibleColumns: IncomeReportColumnId[],
  headerDetails?: ReportHeaderDetails,
): void {
  const allColumns: Record<IncomeReportColumnId, [string, (row: IncomeReportRow) => string]> = {
    receiptNumber: ['रसिद नं.', (row) => row.receiptNumber],
    vehicleNumber: ['सवारी नं. / प्रकार', (row) => `${row.vehicleNumber} / ${row.vehicleType}`],
    customerName: ['ग्राहक / सदस्य', (row) => row.customerName],
    feeTitle: ['आम्दानी शीर्षक (ID)', (row) => `${row.feeTitle} (${row.feeHeadId})`],
    billingEntity: ['Billing Entity', (row) => row.billingEntity],
    branchName: ['शाखा', (row) => row.branchName],
    userName: ['प्रयोगकर्ता', (row) => row.userName],
    paymentMethod: ['भुक्तानी विधि', (row) => row.paymentMethod],
    paymentDate: ['भुक्तानी मिति', (row) => row.paymentDate],
    amount: ['शुल्क रकम', (row) => String(row.amount)],
    receiptTotal: ['रसिद जम्मा', (row) => String(row.receiptTotal)],
    status: ['स्थिति', (row) => row.status],
  };
  const columns = visibleColumns.map((id) => allColumns[id]);
  const headerRows = headerDetails
    ? [
        ['संघ', headerDetails.organizationName],
        ['प्रयोग भइरहेको शाखा', headerDetails.branchName],
        ['कार्यालय', headerDetails.officeAddress],
      [headerDetails.reportTitle, headerDetails.reportDateRange],
        ['मिति', headerDetails.reportDateLine],
      ].map((values) => values.map(csvCell).join(','))
    : [];
  const csv = [
    ...headerRows,
    ...(headerRows.length > 0 ? [''] : []),
    columns.map(([label]) => csvCell(label)).join(','),
    ...rows.map((row) => columns.map(([, getValue]) => csvCell(getValue(row))).join(',')),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileLabel || 'aamdani-report'}.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function openIncomeReportPrintView(
  rows: IncomeReportRow[],
  reportRange: string,
  headerDetails?: ReportHeaderDetails,
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.receiptNumber)}</td>
      <td>${escapeHtml(row.paymentDate)}</td>
      <td>${escapeHtml(row.customerName)}</td>
      <td>${escapeHtml(row.vehicleNumber)}</td>
      <td>${escapeHtml(row.branchName)}</td>
      <td>${escapeHtml(`${row.feeTitle} (${row.feeHeadId})`)}</td>
      <td>${escapeHtml(row.billingEntity)}</td>
      <td>${escapeHtml(row.paymentMethod)}</td>
      <td class="amount">रु ${escapeHtml(formatCurrency(row.amount))}</td>
      <td class="amount">रु ${escapeHtml(formatCurrency(row.receiptTotal))}</td>
      <td>${escapeHtml(row.status)}</td>
    </tr>`).join('');

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="ne">
      <head>
        <meta charset="utf-8">
        <title>आम्दानी रिपोर्ट</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          body { color: #111827; font: 12px system-ui, sans-serif; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          p { margin: 0 0 14px; color: #4b5563; }
          .report-header-details { margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid #d1d5db; text-align: right; line-height: 1.6; }
          .report-header-details p { margin: 0; }
          .report-header-organization { color: #111827; font-size: 16px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 6px 5px; border: 1px solid #d1d5db; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          .amount { text-align: right; white-space: nowrap; }
          tr { break-inside: avoid; }
        </style>
      </head>
      <body>
        ${headerDetails ? `<div class="report-header-details">
          <p class="report-header-organization">${escapeHtml(headerDetails.organizationName)}</p>
          <p>प्रयोग भइरहेको शाखा: ${escapeHtml(headerDetails.branchName)}</p>
          <p>कार्यालय: ${escapeHtml(headerDetails.officeAddress)}</p>
          <p>${escapeHtml(headerDetails.reportTitle)} (${escapeHtml(headerDetails.reportDateRange)})</p>
          <p>मिति: ${escapeHtml(headerDetails.reportDateLine)}</p>
        </div>` : ''}
        <h1>आम्दानी रिपोर्ट</h1>
        <p>अवधि: ${escapeHtml(reportRange)} · शुल्क विवरण: ${rows.length}</p>
        <table>
          <thead><tr><th>क्र.सं.</th><th>रसिद नं.</th><th>भुक्तानी मिति</th><th>ग्राहक / सदस्य</th><th>सवारी नं.</th><th>शाखा</th><th>आम्दानी शीर्षक</th><th>Billing Entity</th><th>भुक्तानी विधि</th><th>शुल्क रकम</th><th>रसिद जम्मा</th><th>स्थिति</th></tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="12">कुनै विवरण भेटिएन।</td></tr>'}</tbody>
        </table>
      </body>
    </html>`);
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 250);
  return true;
}
