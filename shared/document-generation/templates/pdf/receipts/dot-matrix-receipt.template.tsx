import Image from 'next/image';
import { toNepaliDigits } from '@/utils/numbers';
import { DEFAULT_COMPANY_BRANDING } from '../../../components/CompanyBranding';
import { DocumentContacts } from '../../../components/DocumentContacts';
import { PageNumber } from '../../../components/PageNumber';
import { formatAmountInNepaliWords, formatDocumentCount, formatDocumentCurrency } from '../../../utils/format-currency';
import { formatDocumentNepaliDate, formatDocumentTime } from '../../../utils/format-date';
import type { BillTemplateProps } from '../../../types/template.types';
import { dotMatrixReceiptStyles } from './dot-matrix-receipt.styles';

export function DotMatrixReceiptTemplate({ bill, branding: brandingOverrides }: BillTemplateProps) {
  const { content } = bill;
  const branding = { ...DEFAULT_COMPANY_BRANDING, ...brandingOverrides };

  return (
    <>
      <style>{dotMatrixReceiptStyles}</style>
      <article className="dot-matrix-receipt">
        <div className="dot-matrix-topline">
          <PageNumber value={branding.registrationNumber ?? ''} />
          <span />
        </div>

        <header className="dot-matrix-header">
          <div className="dot-matrix-logo">
            <Image src="/narayani-logo.jpeg" alt={branding.name} width={64} height={64} priority />
          </div>
          <div className="dot-matrix-organization">
            <h1>{branding.name}</h1>
            <p>{branding.officeAddress}</p>
            <p>{branding.regionalOfficeText}</p>
            <h2>नगदी रसिद</h2>
          </div>
          <DocumentContacts />
        </header>

        <div className="dot-matrix-identifiers">
          <span>बिल नं. <strong>{bill.receiptNumber}</strong> ({content.branch.name || '—'})</span>
          <span>{branding.panNumber ? <>पान नं. <strong>{toNepaliDigits(branding.panNumber)}</strong></> : null}</span>
          <span>मिति: <strong>{formatDocumentNepaliDate(content.billingDate)} ({formatDocumentTime(bill.createdAt)})</strong></span>
        </div>

        <section className="dot-matrix-party">
          <div>सदस्यको नाम: <strong>{content.vehicle.ownerName || '—'}</strong></div>
          <div>सम्पर्क नं.: <strong>{content.vehicle.phone || '—'}</strong></div>
          <div>ठेगाना: <strong>{content.vehicle.address || '—'}</strong></div>
          <div>सवारी नं.: <strong>{content.vehicle.vehicleNumber || '—'}</strong>{content.vehicle.vehicleType ? ` (${content.vehicle.vehicleType})` : ''}</div>
          <div className="dot-matrix-period">
            आर्थिक वर्ष: <strong>{content.fiscalYearName}</strong>
            {content.periodStart || content.periodEnd
              ? <> · अवधि: {formatDocumentNepaliDate(content.periodStart)} देखि {formatDocumentNepaliDate(content.periodEnd)} सम्म</>
              : null}
          </div>
        </section>

        <table className="dot-matrix-items">
          <thead>
            <tr><th>सि.नं.</th><th>विवरण</th><th>रकम (रु.)</th></tr>
          </thead>
          <tbody>
            {content.items.map((item, index) => (
              <tr key={`${item.feeHeadId}-${index}`}>
                <td className="dot-matrix-center">{formatDocumentCount(index + 1)}</td>
                <td>{item.title}</td>
                <td className="dot-matrix-number">{formatDocumentCurrency(item.amount)}</td>
              </tr>
            ))}
            {content.discount > 0 ? (
              <tr>
                <td />
                <td>छुट</td>
                <td className="dot-matrix-number">-{formatDocumentCurrency(content.discount)}</td>
              </tr>
            ) : null}
            <tr className="dot-matrix-total">
              <td />
              <td>जम्मा</td>
              <td className="dot-matrix-number">{formatDocumentCurrency(content.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="dot-matrix-summary">
          <p>अक्षरमा: <strong>{formatAmountInNepaliWords(content.total)}</strong></p>
          <p>भुक्तानी विधि: <strong>{content.paymentMethod || '—'}</strong></p>
          {content.note ? <p className="dot-matrix-note">कैफियत: {content.note}</p> : null}
        </div>

        <footer className="dot-matrix-signatures">
          <div className="dot-matrix-signature">
            <span className="dot-matrix-signature-line" />
            <strong>बुझाउनेको सही</strong>
            <span>{formatDocumentTime(bill.createdAt)}</span>
          </div>
          <div className="dot-matrix-signature">
            <span className="dot-matrix-signature-line" />
            <strong>बुझिलिनेको सही</strong>
            <span>{content.branch.contactPerson || content.branch.name || '—'}</span>
          </div>
        </footer>
      </article>
    </>
  );
}
