import type { ReceiptStatus } from '@/features/receipts/model/receipt';

export type IncomeReportDateBasis = 'paymentDate' | 'billingDate';

export type IncomeReportFilters = {
  fiscalYear: string;
  branch: string;
  user: string;
  billType: string;
  feeHead: string;
  dateFrom: string;
  dateTo: string;
  dateBasis: IncomeReportDateBasis;
};

export type IncomeReportRow = {
  id: string;
  displayNumber?: number;
  receiptId: string;
  receiptNumber: string;
  paymentDate: string;
  billingDate: string;
  periodStart: string;
  periodEnd: string;
  billingMonths: number;
  customerName: string;
  operatorName: string;
  vehicleNumber: string;
  vehicleType: string;
  branchName: string;
  userName: string;
  fiscalYear: string;
  paymentMethod: string;
  note: string;
  feeHeadId: string;
  feeTitle: string;
  billingEntity: string;
  amount: number;
  membershipIncome: number;
  otherIncome: number;
  receiptTotal: number;
  status: ReceiptStatus;
};
