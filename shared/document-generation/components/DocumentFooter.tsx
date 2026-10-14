import { formatDocumentEnglishDate, formatDocumentTime } from '../utils/format-date';

export function DocumentFooter({
  createdAt,
  billingDate,
  issuedBy,
}: {
  createdAt: string;
  billingDate: string;
  issuedBy: string;
}) {
  return (
    <footer className="document-footer">
      <div className="document-signature">
        <span className="document-signature-line" />
        <strong>बुझाउनेको सही</strong>
        <span className="document-english-date">{formatDocumentEnglishDate(billingDate)}</span>
      </div>
      <div className="document-clock">{formatDocumentTime(createdAt)}</div>
      <div className="document-signature document-signature-right">
        <span className="document-signature-line" />
        <strong>बुझिलिनेको सही</strong>
        <span>{issuedBy}</span>
      </div>
    </footer>
  );
}
