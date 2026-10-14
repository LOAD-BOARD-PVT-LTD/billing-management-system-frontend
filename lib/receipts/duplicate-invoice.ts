export const DUPLICATE_INVOICE_CONFIRMATION_REQUIRED = 'DUPLICATE_INVOICE_CONFIRMATION_REQUIRED';

export type DuplicateInvoiceConfirmationPayload = {
  confirmed: boolean;
  fingerprint?: string | null;
};

export type DuplicateInvoiceConfirmationMatch = {
  invoiceId: string;
  receiptNumber: string | null;
  fiscalYear: string | null;
  paymentDateBs: string | null;
  totalAmount: number | null;
  billingEntity: string;
  periodFromBs: string | null;
  periodToBs: string;
  duplicateLabels: string[];
};

export type DuplicateInvoiceConfirmationDetails = {
  fingerprint: string;
  staleConfirmation: boolean;
  matches: DuplicateInvoiceConfirmationMatch[];
};
