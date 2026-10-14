import type { SavedBill } from '@/features/billing/model/bill.types';
import type { CompanyBrandingOptions } from './document.types';

export type BillTemplateProps = {
  bill: SavedBill;
  branding?: Partial<CompanyBrandingOptions>;
};

export type ReceiptTemplateProps = BillTemplateProps;
