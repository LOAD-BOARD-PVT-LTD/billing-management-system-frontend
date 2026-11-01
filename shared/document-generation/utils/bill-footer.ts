import type { BillResourceContent } from '@/features/billing/model/bill.types';
import { formatDocumentEnglishTimestamp, formatDocumentTime } from './format-date';

export const BILL_FOOTER_LABELS = {
  payerSignature: 'बुझाउनेको सही',
  receiverSignature: 'बुझिलिनेको सही',
} as const;

export function getBillFooterDetails(
  content: Pick<BillResourceContent, 'createdBy' | 'branch'>,
  viewedAt: string,
) {
  return {
    date: formatDocumentEnglishTimestamp(viewedAt),
    time: formatDocumentTime(viewedAt),
    issuedBy: content.createdBy?.name
      || content.createdBy?.username
      || content.branch.contactPerson
      || content.branch.name
      || '—',
  };
}
