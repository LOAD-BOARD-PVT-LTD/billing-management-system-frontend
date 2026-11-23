import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { IncomeReportRow } from '@/features/reports/types/income-report';

export function mapIncomeReportRows(receipts: ReceiptRecord[]): IncomeReportRow[] {
  return receipts.flatMap((receipt) => {
    const items = receipt.bill.content.items;
    const paymentDate = receipt.bill.content.paidAt?.slice(0, 10) || receipt.paymentDate;
    const isGeneral = receipt.billingType === 'GENERAL';
    const membershipIncome = isGeneral ? 0 : receipt.totalAmount;
    const otherIncome = isGeneral ? receipt.totalAmount : 0;

    return items.map((item, index) => ({
      id: `${receipt.id}-${index}`,
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      paymentDate,
      billingDate: receipt.billingDate,
      periodStart: receipt.bill.content.periodStart || '',
      periodEnd: receipt.bill.content.periodEnd || receipt.validUntil || '',
      billingMonths: receipt.bill.content.billingMonths || 0,
      customerName: receipt.customerName,
      operatorName: receipt.bill.content.vehicle.operatorName || '',
      vehicleNumber: receipt.vehicleNumber,
      vehicleType: receipt.bill.content.vehicle.vehicleType,
      branchName: receipt.branchName,
      userName: receipt.userName,
      fiscalYear: receipt.fiscalYear,
      paymentMethod: receipt.paymentMethod,
      note: receipt.bill.content.note?.trim() || '',
      feeHeadId: item.feeHeadId,
      feeTitle: item.title,
      billingEntity: item.billingEntity,
      amount: item.amount,
      membershipIncome,
      otherIncome,
      receiptTotal: receipt.totalAmount,
      status: receipt.status,
    }));
  });
}
