import { CompanyBranding, DEFAULT_COMPANY_BRANDING } from '../../../components/CompanyBranding';
import { DocumentContacts } from '../../../components/DocumentContacts';
import { DocumentFooter } from '../../../components/DocumentFooter';
import { DocumentHeader } from '../../../components/DocumentHeader';
import { PageNumber } from '../../../components/PageNumber';
import type { BillTemplateProps } from '../../../types/template.types';
import { formatAmountInNepaliWords, formatDocumentCount, formatDocumentCurrency } from '../../../utils/format-currency';
import { formatDocumentNepaliDate, formatDocumentTime } from '../../../utils/format-date';
import { billTemplateStyles } from './bill.styles';
import { getBillOwnerDisplayLines } from '@/features/receipts/utils/receipt-owners';

export function BillTemplate({ bill, branding: brandingOverrides }: BillTemplateProps) {
  const { content } = bill;
  const branding = { ...DEFAULT_COMPANY_BRANDING, ...brandingOverrides };
  const ownerLines = getBillOwnerDisplayLines(
    content.vehicle.ownerName,
    content.vehicle.operatorName,
    content.vehicle.phone,
  );

  return (
    <>
      <style>{billTemplateStyles}</style>
      <article className="document-page">
        <div className="document-topline">
          <PageNumber value={branding.registrationNumber ?? ''} />
        </div>
        <DocumentHeader>
          <CompanyBranding branding={branding} />
          <DocumentContacts />
        </DocumentHeader>

        <div className="document-identifiers">
          <span>बिल नं. <strong>{bill.receiptNumber}</strong> {content.branch.name ? <strong>({content.branch.name})</strong> : null}</span>
          <span>
            {branding.panNumber ? <>पान नं. <strong>{branding.panNumber}</strong></> : null}
          </span>
          <span>मिति <strong>{formatDocumentNepaliDate(content.billingDate)} ({formatDocumentTime(bill.createdAt)})</strong></span>
        </div>

        <section className="document-parties">
          {ownerLines.map((line) => (
            <div key={`${line.label}-${line.name}`} className="document-party-line">
              {line.label ? `${line.label} ` : null}
              <strong>{line.name}</strong>{line.suffix}
            </div>
          ))}
          <div className="document-party-line">
            ठेगाना: <strong>{content.vehicle.address || '—'}</strong>
          </div>
          <div className="document-party-line">
            सवारी नं.: <strong>{content.vehicle.vehicleNumber || '—'}</strong>
            {content.vehicle.vehicleType ? ` (${content.vehicle.vehicleType})` : ''}
          </div>
          <div className="document-party-line">
            शाखा: <strong>{content.branch.name || '—'}</strong>
            {content.branch.BranchCode ? ` (${content.branch.BranchCode})` : ''}
          </div>
          <div className="document-party-line document-period">
            आर्थिक वर्ष: <strong>{content.fiscalYearName}</strong>
            {content.periodStart || content.periodEnd
              ? <> को लागि मिति {formatDocumentNepaliDate(content.periodStart)} देखि {formatDocumentNepaliDate(content.periodEnd)} सम्म</>
              : null}
            {content.billingType !== 'GENERAL' ? ' संघको नियमानुसार रकम प्राप्त भयो' : null}
          </div>
        </section>

        <table className="document-items">
          <colgroup>
            <col className="document-col-index" />
            <col className="document-col-description" />
            <col className="document-col-rate" />
            <col className="document-col-total" />
            <col className="document-col-note" />
          </colgroup>
          <thead>
            <tr>
              <th>सि.नं.</th>
              <th>रसिद विवरण</th>
              <th>रकम दर</th>
              <th>जम्मा रकम</th>
              <th>कैफियत</th>
            </tr>
          </thead>
          <tbody>
            {content.items.map((item, index) => (
              <tr
                key={`${item.feeHeadId}-${index}`}
                className={index === content.items.length - 1 ? 'document-fee-head-row-last' : 'document-fee-head-row'}
              >
                <td className="document-center">{formatDocumentCount(index + 1)}</td>
                <td>{item.title}</td>
                <td className="document-number">{formatDocumentCurrency(item.amount)}</td>
                <td className="document-number">{formatDocumentCurrency(item.amount)}</td>
                <td />
              </tr>
            ))}
            {content.discount > 0 ? (
              <tr>
                <td />
                <td>छुट</td>
                <td className="document-number">-{formatDocumentCurrency(content.discount)}</td>
                <td className="document-number">-{formatDocumentCurrency(content.discount)}</td>
                <td />
              </tr>
            ) : null}
            <tr className="document-total-row">
              <td>{content.billingType !== 'GENERAL' ? 'रुट:' : null}</td>
              <td>{content.billingType !== 'GENERAL' ? content.vehicle.route || '' : null}</td>
              <td>जम्मा रु.</td>
              <td className="document-number">{formatDocumentCurrency(content.total)}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="document-remarks">
          <p>अक्षरमा: {formatAmountInNepaliWords(content.total)}</p>
          <p>कैफियत: {content.note || content.paymentMethod || '—'}</p>
        </div>

        <DocumentFooter
          content={content}
        />
      </article>
    </>
  );
}
