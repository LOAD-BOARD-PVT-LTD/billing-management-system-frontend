import type { ReceiptRecord } from '@/features/receipts/model/receipt';

export type FeeHeadSummaryRow = {
  id: string;
  feeHeadId: string;
  feeTitle: string;
  transactionCount: number;
  itemCount: number;
  amount: number;
};

export type VehicleCategorySummaryRow = {
  id: string;
  category: string;
  vehicleCount: number;
  transactionCount: number;
  amount: number;
};

export type MahasangReportRow = {
  id: string;
  vehicleNumber: string;
  previousVehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  note: string;
  receiptNumber: string;
  membershipIncome: number;
  otherIncome: number;
  total: number;
  periodMonths: number;
  paymentMethod: string;
  billingDate: string;
  periodStart: string;
  periodEnd: string;
};

export type MemberTransactionRow = {
  id: string;
  receipt: ReceiptRecord;
  feeTitles: string;
  phone: string;
  memberNumber: string;
  previousVehicleNumber: string;
};
