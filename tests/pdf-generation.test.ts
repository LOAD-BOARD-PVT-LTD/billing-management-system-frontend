import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDocumentCurrency,
  formatAmountInNepaliWords,
  formatDocumentCount,
} from '@/shared/document-generation/utils/format-currency';
import {
  formatDocumentNepaliDate,
  formatDocumentTime,
  formatDocumentEnglishTimestamp,
} from '@/shared/document-generation/utils/format-date';
import {
  BILL_FOOTER_LABELS,
  getBillFooterDetails,
} from '@/shared/document-generation/utils/bill-footer';
import { billTemplateStyles } from '@/shared/document-generation/templates/pdf/billing/bill.styles';
import { createReceiptPdfBlob } from '@/features/receipts/services/receipt-document.service';
import type { BillResourceContent, SavedBill } from '@/features/billing/model/bill.types';
import fs from 'node:fs';
import path from 'node:path';

describe('5. PDF and Document Output', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Document Currency & Words Formatting', () => {
    test('formats numeric currency amounts with Nepali comma separation', () => {
      assert.equal(formatDocumentCurrency(1500), '१,५००.००');
      assert.equal(formatDocumentCurrency(1234567.5), '१२,३४,५६७.५०');
      assert.equal(formatDocumentCurrency(0), '०.००');
    });

    test('formats amounts in Nepali words correctly', () => {
      assert.equal(formatAmountInNepaliWords(1500), 'एक हजार पाँच सय रुपैयाँ मात्र');
      assert.equal(formatAmountInNepaliWords(0), 'शून्य रुपैयाँ मात्र');
    });

    test('formats count in Nepali digits', () => {
      assert.equal(formatDocumentCount(1), '१');
      assert.equal(formatDocumentCount(12), '१२');
    });
  });

  describe('Document Date & Time Formatting', () => {
    test('formats Nepali dates correctly', () => {
      assert.equal(formatDocumentNepaliDate('2081-05-15'), '२०८१/०५/१५');
      assert.equal(formatDocumentNepaliDate(''), '');
    });

    test('formats English timestamp and time safely', () => {
      const iso = '2026-10-31T10:30:00.000Z';
      const englishDate = formatDocumentEnglishTimestamp(iso);
      assert.ok(englishDate.length > 0);
      assert.ok(!englishDate.includes('NaN'));

      const timeStr = formatDocumentTime(iso);
      assert.ok(timeStr.length > 0);
    });
  });

  describe('Bill Footer & Signatures Hierarchy', () => {
    const dummyBranch = {
      id: 'BR-1',
      name: 'KTM Branch',
      BranchCode: 'KTM',
      address: 'Kathmandu',
      phone: '01',
      contactPerson: 'Manager',
    };

    test('uses correct Nepali signature labels', () => {
      assert.equal(BILL_FOOTER_LABELS.payerSignature, 'बुझाउनेको सही');
      assert.equal(BILL_FOOTER_LABELS.receiverSignature, 'बुझिलिनेको सही');
    });

    test('resolves issuer name according to fallback hierarchy: name -> username -> contactPerson -> branch -> dash', () => {
      // 1. With creator name
      const withName = getBillFooterDetails({
        createdBy: { id: 'U1', name: 'Ram Accountant', username: 'ram' },
        branch: dummyBranch,
      }, '2026-10-31T00:00:00Z');
      assert.equal(withName.issuedBy, 'Ram Accountant');

      // 2. Fallback to username
      const withUsername = getBillFooterDetails({
        createdBy: { id: 'U1', name: '', username: 'ram@sangh.org' },
        branch: dummyBranch,
      }, '2026-10-31T00:00:00Z');
      assert.equal(withUsername.issuedBy, 'ram@sangh.org');

      // 3. Fallback to branch contact person
      const withContact = getBillFooterDetails({
        createdBy: undefined,
        branch: { ...dummyBranch, contactPerson: 'Hari Manager' },
      }, '2026-10-31T00:00:00Z');
      assert.equal(withContact.issuedBy, 'Hari Manager');

      // 4. Fallback to branch name
      const withBranch = getBillFooterDetails({
        createdBy: undefined,
        branch: { ...dummyBranch, contactPerson: '' },
      }, '2026-10-31T00:00:00Z');
      assert.equal(withBranch.issuedBy, 'KTM Branch');
    });
  });

  describe('Bill Template Styles & Layout Constraints', () => {
    test('preserves design requirement: no horizontal separators between fee rows', () => {
      assert.ok(
        (billTemplateStyles.includes('.document-fee-head-row td') &&
        billTemplateStyles.includes('border-top:0; border-bottom:0;')) ||
        billTemplateStyles.includes('border-top:0;') ||
        billTemplateStyles.includes('border-top:none;'),
      );
    });

    test('preserves design requirement: visible bottom border on last fee row', () => {
      assert.ok(billTemplateStyles.includes('.document-fee-head-row-last td'));
      assert.ok(billTemplateStyles.includes('border-bottom:1px solid #222;'));
    });

    test('preserves total row bold style and outline borders', () => {
      assert.ok(billTemplateStyles.includes('.document-total-row td { font-weight:700; }'));
      assert.ok(billTemplateStyles.includes('.document-items th, .document-items td { height:29px; border:1px solid #222;'));
    });
  });

  describe('Receipt PDF Binary Generation (createReceiptPdfBlob)', () => {
    const validContent: BillResourceContent = {
      billingType: 'MEMBERSHIP',
      vehicle: {
        id: 'V1',
        vehicleNumber: 'Ba 1 Ja 1111',
        vehicleType: 'Taxi',
        ownerName: 'Krishna Prasad',
        phone: '9841000000',
        address: 'Kathmandu',
      },
      branch: {
        id: 'BR-1',
        name: 'Kathmandu',
        BranchCode: 'KTM',
        address: 'Kathmandu',
        phone: '01-4000000',
        contactPerson: 'Sita',
      },
      fiscalYearId: 'FY1',
      fiscalYearName: '2081/82',
      billingDate: '2081-07-01',
      periodStart: '2081-07-01',
      periodEnd: '2081-07-30',
      billingMonths: 1,
      items: [
        { feeHeadId: 'F1', title: 'Monthly Route Fee', billingEntityId: 'E1', billingEntity: 'Sangh', ruleId: null, amount: 1000 },
      ],
      subtotal: 1000,
      discount: 100,
      total: 900,
      paymentMethod: 'नगद',
      note: 'Receipt note',
    };

    const validBill: SavedBill = {
      id: 'REC-500',
      receiptNumber: 'KTM.REC-500',
      createdAt: '2026-10-31T10:00:00Z',
      content: validContent,
    };

    test('throws if required bill details are missing (id, receiptNumber, items)', async () => {
      await assert.rejects(
        () => createReceiptPdfBlob({ ...validBill, id: '' }, 1),
        /रसिद PDF बनाउन आवश्यक विवरण उपलब्ध छैन।/,
      );
      await assert.rejects(
        () => createReceiptPdfBlob({ ...validBill, receiptNumber: '' }, 1),
        /रसिद PDF बनाउन आवश्यक विवरण उपलब्ध छैन।/,
      );
      await assert.rejects(
        () => createReceiptPdfBlob({ ...validBill, content: { ...validBill.content, items: [] } }, 1),
        /रसिद PDF बनाउन आवश्यक विवरण उपलब्ध छैन।/,
      );
    });

    test('throws a clear failure when font asset cannot be loaded (404/500)', async () => {
      globalThis.fetch = async () => {
        return new Response(null, { status: 404, statusText: 'Not Found' });
      };

      await assert.rejects(
        () => createReceiptPdfBlob(validBill, 1),
        /Could not load Fontasy Nepali font \(404\)/,
      );
    });

    test('throws a clear failure when font asset is empty (0 bytes)', async () => {
      globalThis.fetch = async () => {
        return new Response(new ArrayBuffer(0), { status: 200 });
      };

      await assert.rejects(
        () => createReceiptPdfBlob(validBill, 1),
        /Fontasy Nepali font is empty/,
      );
    });

    test('throws a clear failure when logo asset cannot be loaded', async () => {
      const fontBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/fonts/Fontasy_Himali_TT.ttf'));
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes('Fontasy')) {
          return new Response(fontBuffer, { status: 200 });
        }
        return new Response(null, { status: 500, statusText: 'Server Error' });
      };

      await assert.rejects(
        () => createReceiptPdfBlob(validBill, 1),
        /Could not load receipt logo \(500\)/,
      );
    });

    test('generates valid non-zero PDF blob with %PDF- header when assets are available', async () => {
      const fontBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/fonts/Fontasy_Himali_TT.ttf'));
      const logoBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/narayani-logo.jpeg'));

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes('Fontasy')) {
          return new Response(fontBuffer, { status: 200 });
        }
        if (urlStr.includes('logo')) {
          return new Response(logoBuffer, { status: 200 });
        }
        return new Response(null, { status: 404 });
      };

      const blob = await createReceiptPdfBlob(validBill, 1);
      assert.ok(blob.size > 1000);
      assert.equal(blob.type, 'application/pdf');

      const arrayBuffer = await blob.arrayBuffer();
      const header = String.fromCharCode(...new Uint8Array(arrayBuffer.slice(0, 5)));
      assert.equal(header, '%PDF-');
    });

    test('generates valid PDF for General Bill (with customer PAN and no vehicle info)', async () => {
      const fontBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/fonts/Fontasy_Himali_TT.ttf'));
      const logoBuffer = fs.readFileSync(path.resolve(process.cwd(), 'public/narayani-logo.jpeg'));

      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input);
        if (urlStr.includes('Fontasy')) return new Response(fontBuffer, { status: 200 });
        if (urlStr.includes('logo')) return new Response(logoBuffer, { status: 200 });
        return new Response(null, { status: 404 });
      };

      const generalBill: SavedBill = {
        id: 'GEN-200',
        receiptNumber: 'KTM.GEN-200',
        createdAt: '2026-10-31T11:00:00Z',
        content: {
          billingType: 'GENERAL',
          customer: {
            name: 'ABC Suppliers Pvt Ltd',
            phone: '9800000000',
            address: 'Birgunj',
            panNumber: '600123456',
          },
          vehicle: {
            id: '',
            vehicleNumber: '',
            vehicleType: '',
            ownerName: 'ABC Suppliers Pvt Ltd',
            phone: '9800000000',
            address: 'Birgunj',
          },
          branch: {
            id: 'BR-1',
            name: 'Kathmandu',
            BranchCode: 'KTM',
            address: 'Kathmandu',
            phone: '01',
            contactPerson: 'Manager',
          },
          fiscalYearId: 'FY1',
          fiscalYearName: '2081/82',
          billingDate: '2081-07-01',
          periodStart: '',
          periodEnd: '',
          billingMonths: 0,
          items: [
            { feeHeadId: '', title: 'Conference Hall Charge', billingEntityId: 'E1', billingEntity: 'Sangh', ruleId: null, amount: 5000 },
          ],
          subtotal: 5000,
          discount: 0,
          total: 5000,
          paymentMethod: 'बैंक',
          note: 'Payment complete',
        },
      };

      const blob = await createReceiptPdfBlob(generalBill, 1);
      assert.ok(blob.size > 1000);
      assert.equal(blob.type, 'application/pdf');
    });
  });
});
