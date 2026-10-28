import type { SavedBill } from '@/features/billing/model/bill.types';

export type ReceiptStatus = 'PAID' | 'CANCELLED' | 'PENDING';

export interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  fiscalYear: string;
  vehicleNumber: string;
  finalDigits: string;
  customerName: string;
  organizationName: string;
  billingDate: string;
  paymentDate: string;
  validUntil: string;
  paymentMethod: string;
  status: ReceiptStatus;
  totalAmount: number;
  branchName: string;
  userName: string;
  bill: SavedBill;
  resourceContent?: Record<string, unknown>;
  externalContent?: unknown;
  printedCopyCount: number;
  lastPrintedAt?: string;
  lastCorrection?: { reason: string; at: string };
}

export interface ReceiptFilters {
  search: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  user: string;
  status: string;
}

export type ReceiptSortColumn = Exclude<keyof ReceiptRecord, 'bill'>;
export type ReceiptSortDirection = 'asc' | 'desc' | null;