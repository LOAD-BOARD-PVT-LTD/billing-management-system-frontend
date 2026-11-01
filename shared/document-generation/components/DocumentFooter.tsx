import type { BillResourceContent } from '@/features/billing/model/bill.types';
import { BILL_FOOTER_LABELS, getBillFooterDetails } from '../utils/bill-footer';

export function DocumentFooter({ content }: { content: Pick<BillResourceContent, 'createdBy' | 'branch'> }) {
  const viewedAt = new Date().toISOString();
  const details = getBillFooterDetails(content, viewedAt);

  return (
    <footer className="document-footer">
      <div className="document-signature">
        <span className="document-signature-line" />
        <strong>{BILL_FOOTER_LABELS.payerSignature}</strong>
        <span className="document-english-date">{details.date}</span>
      </div>
      <div className="document-clock">{details.time}</div>
      <div className="document-signature document-signature-right">
        <span className="document-signature-line" />
        <strong>{BILL_FOOTER_LABELS.receiverSignature}</strong>
        <span>{details.issuedBy}</span>
      </div>
    </footer>
  );
}
