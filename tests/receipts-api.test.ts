import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBillResource,
  recordReceiptPrint,
  cancelReceipt,
  correctReceipt,
  type ReceiptCorrection,
} from '@/features/receipts/api/bill-resource.api';
import {
  formatBranchReceiptNumber,
  formatReceiptNumberWithFiscalYear,
} from '@/lib/receipts/receipt-number-display';
import { apiClient } from '@/lib/api/client';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import type { SavedBill } from '@/features/billing/model/bill.types';

describe('4. Bill API, Receipts, and Numbering', () => {
  const originalGet = apiClient.get;
  const originalPut = apiClient.put;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.put = originalPut;
  });

  describe('Branch Receipt Numbering (formatBranchReceiptNumber)', () => {
    test('formats valid branch code and receipt ID', () => {
      assert.equal(formatBranchReceiptNumber('KTM', '101'), 'KTM.101');
      assert.equal(formatBranchReceiptNumber('POK', String(505)), 'POK.505');
    });

    test('strips trailing dots from branch code', () => {
      assert.equal(formatBranchReceiptNumber('KTM...', '101'), 'KTM.101');
    });

    test('throws when branch code is missing or empty', () => {
      assert.throws(
        () => formatBranchReceiptNumber('', '101'),
        /Receipt number cannot be created without a branch code/,
      );
      assert.throws(
        () => formatBranchReceiptNumber('   ', '101'),
        /Receipt number cannot be created without a branch code/,
      );
      assert.throws(
        () => formatBranchReceiptNumber(null, '101'),
        /Receipt number cannot be created without a branch code/,
      );
    });

    test('throws when receipt ID is missing or empty', () => {
      assert.throws(
        () => formatBranchReceiptNumber('KTM', ''),
        /Receipt number cannot be created without a bill resource ID/,
      );
      assert.throws(
        () => formatBranchReceiptNumber('KTM', null),
        /Receipt number cannot be created without a bill resource ID/,
      );
    });

    test('formats receipt number with fiscal year suffix in Nepali digits', () => {
      assert.equal(formatReceiptNumberWithFiscalYear('KTM.101', '2081/82'), 'KTM.101 (२०८१/८२)');
      assert.equal(formatReceiptNumberWithFiscalYear('KTM.101', ''), 'KTM.101');
      assert.equal(formatReceiptNumberWithFiscalYear('', '2081/82'), '');
    });
  });

  describe('Receipt Parsing (parseBillResource)', () => {
    const validRawResource = {
      id: 'BILL-100',
      resource_name: 'BillResource',
      createdAt: '2026-05-15T10:00:00.000Z',
      inner_content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: 'V1',
          vehicleNumber: 'Ba 1 Ja 5555',
          vehicleType: 'Taxi',
          ownerName: 'Hari Prasad',
          phone: '9841000000',
          address: 'Kathmandu',
        },
        branch: {
          id: 'BR-1',
          name: 'Kathmandu Branch',
          BranchCode: 'KTM',
        },
        fiscalYearId: 'FY-8182',
        billingDate: '2081-02-15',
        periodStart: '2081-02-01',
        periodEnd: '2081-02-30',
        items: [
          { feeHeadId: 'FH-1', title: 'Route Fee', billingEntityId: 'E1', amount: 1200 },
        ],
        subtotal: 1200,
        discount: 100,
        total: 1100,
        paymentMethod: 'नगद',
      },
    };

    test('parses valid raw resource with numeric or string ID', () => {
      const record = parseBillResource(validRawResource);
      assert.equal(record.id, 'BILL-100');
      assert.equal(record.receiptNumber, 'KTM.BILL-100');
      assert.equal(record.vehicleNumber, 'Ba 1 Ja 5555');
      assert.equal(record.totalAmount, 1100);
      assert.equal(record.status, 'PAID');
    });

    test('preserves the vehicle route on the receipt', () => {
      const record = parseBillResource({
        ...validRawResource,
        inner_content: {
          ...validRawResource.inner_content,
          vehicle: {
            ...validRawResource.inner_content.vehicle,
            route: 'Bagmati Province (P3), Kathmandu',
          },
        },
      });

      assert.equal(record.bill.content.vehicle.route, 'Bagmati Province (P3), Kathmandu');
    });

    test('uses the billing SMS override as the receipt contact while preserving the TQMS owner phone', () => {
      const record = parseBillResource({
        ...validRawResource,
        inner_content: {
          ...validRawResource.inner_content,
          vehicle: {
            ...validRawResource.inner_content.vehicle,
            smsPhone: '9800000000',
          },
        },
      });

      assert.equal(record.customerPhone, '9800000000');
      assert.equal(record.bill.content.vehicle.phone, '9841000000');
      assert.equal(record.bill.content.vehicle.smsPhone, '9800000000');
    });

    test('throws if resource ID is missing', () => {
      const missingId = { ...validRawResource, id: undefined, resourceId: undefined };
      assert.throws(
        () => parseBillResource(missingId),
        /BillResource response is missing its resource ID/,
      );
    });

    test('throws if resource name is not BillResource', () => {
      const invalidName = { ...validRawResource, resource_name: 'OtherResource' };
      assert.throws(
        () => parseBillResource(invalidName),
        /Could not read receipt: expected BillResource, received OtherResource/,
      );
    });

    test('throws if inner_content is missing', () => {
      const noContent = { id: 'B1', resource_name: 'BillResource', inner_content: null };
      assert.throws(
        () => parseBillResource(noContent),
        /BillResource.inner_content is missing/,
      );
    });

    test('resolves fallback billing dates: billing_date, paymentDate, paidAt, createdAt', () => {
      const createWithDateKey = (dateKey: string, dateVal: string) => ({
        id: 'B2',
        resource_name: 'BillResource',
        inner_content: {
          vehicle: { vehicleNumber: '123' },
          branch: { id: 'B1', name: 'Branch', BranchCode: 'BR' },
          fiscalYearId: 'FY1',
          items: [{ title: 'Fee', amount: 100 }],
          [dateKey]: dateVal,
        },
      });

      assert.equal(parseBillResource(createWithDateKey('billing_date', '2081-03-01')).billingDate, '2081-03-01');
      assert.equal(parseBillResource(createWithDateKey('paymentDate', '2081-03-02')).billingDate, '2081-03-02');
      assert.equal(parseBillResource(createWithDateKey('paidAt', '2081-03-03T00:00:00')).billingDate, '2081-03-03');
    });

    test('fails clearly if no usable billing date exists in content or timestamps', () => {
      const noDatePayload = {
        id: 'B99',
        resource_name: 'BillResource',
        inner_content: {
          vehicle: { vehicleNumber: '123' },
          branch: { id: 'B1', name: 'Branch', BranchCode: 'BR' },
          fiscalYearId: 'FY1',
          items: [{ title: 'Fee', amount: 100 }],
        },
      };

      assert.throws(
        () => parseBillResource(noDatePayload),
        /billing date is missing from the bill and resource timestamps/,
      );
    });

    test('calculates printedCopyCount and tracks last printed date from auditHistory', () => {
      const payloadWithAudit = {
        ...validRawResource,
        inner_content: {
          ...validRawResource.inner_content,
          auditHistory: [
            { action: 'PRINTED', copyCount: 1, at: '2026-05-15T11:00:00Z' },
            { action: 'PRINTED', copyCount: 2, at: '2026-05-15T12:00:00Z' },
          ],
        },
      };

      const record = parseBillResource(payloadWithAudit);
      assert.equal(record.printedCopyCount, 3);
      assert.equal(record.lastPrintedAt, '2026-05-15T12:00:00Z');
    });
  });

  describe('Receipt Print Tracking (recordReceiptPrint)', () => {
    test('enforces copyCount between 1 and 5', async () => {
      await assert.rejects(
        () => recordReceiptPrint('B1', {}, null, 0),
        /प्रतिलिपि संख्या १ देखि ५ सम्म हुनुपर्छ।/,
      );
      await assert.rejects(
        () => recordReceiptPrint('B1', {}, null, 6),
        /प्रतिलिपि संख्या १ देखि ५ सम्म हुनुपर्छ।/,
      );
      await assert.rejects(
        () => recordReceiptPrint('B1', {}, null, 1.5),
        /प्रतिलिपि संख्या १ देखि ५ सम्म हुनुपर्छ।/,
      );
    });

    test('records print action with copyCount in auditHistory', async () => {
      let putPayloadInner: { auditHistory?: Array<{ action: string; copyCount: number }> } | undefined;
      apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
        const parsed = body as { inner_content?: typeof putPayloadInner };
        putPayloadInner = parsed?.inner_content;
        return undefined as unknown as T;
      };

      const content = {
        vehicle: { vehicleNumber: '123' },
        auditHistory: [{ action: 'OTHER' }],
      };

      const updated = await recordReceiptPrint('B1', content, null, 2);
      const audit = (updated as { auditHistory: Array<{ action: string; copyCount: number }> }).auditHistory;
      assert.equal(audit.length, 2);
      assert.equal(audit[1].action, 'PRINTED');
      assert.equal(audit[1].copyCount, 2);
      assert.ok(putPayloadInner);
      assert.equal(putPayloadInner?.auditHistory?.[1].copyCount, 2);
    });
  });

  describe('Receipt Cancellation (cancelReceipt)', () => {
    test('requires a non-empty cancellation reason', async () => {
      const receipt = {
        id: 'B1',
        bill: { content: {} as SavedBill['content'] } as SavedBill,
      } as ReceiptRecord;
      await assert.rejects(
        () => cancelReceipt(receipt, '   '),
        /रसिद रद्द गर्ने कारण लेख्नुहोस्।/,
      );
    });

    test('updates receipt status to CANCELLED and adds audit history entry', async () => {
      let putInner: { status: string; auditHistory: Array<{ action: string; reason: string }> } | undefined;
      apiClient.put = async <T>(_url: string, body?: unknown): Promise<T> => {
        const parsed = body as { inner_content: typeof putInner };
        putInner = parsed?.inner_content;
        return undefined as unknown as T;
      };

      const dummyBill: SavedBill = {
        id: 'B1',
        receiptNumber: 'BR.1',
        createdAt: '2026-10-31T00:00:00Z',
        content: {
          billingType: 'MEMBERSHIP',
          vehicle: { id: '1', vehicleNumber: '123', vehicleType: '', ownerName: '', phone: '', address: '' },
          branch: { id: '1', name: 'BR', BranchCode: 'BR', address: '', phone: '', contactPerson: '' },
          fiscalYearId: 'FY1',
          fiscalYearName: '2081/82',
          billingDate: '2081-01-01',
          periodStart: '',
          periodEnd: '',
          billingMonths: 0,
          items: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          paymentMethod: 'नगद',
          note: '',
        },
      };

      const receipt: ReceiptRecord = {
        id: 'B1',
        billingType: 'MEMBERSHIP',
        customerPhone: '',
        customerPanNumber: '',
        receiptNumber: 'BR.1',
        fiscalYear: '2081/82',
        vehicleNumber: '123',
        finalDigits: '123',
        customerName: 'Owner',
        organizationName: 'Org',
        billingDate: '2081-01-01',
        paymentDate: '2081-01-01',
        validUntil: '',
        paymentMethod: 'नगद',
        status: 'PAID',
        totalAmount: 100,
        branchName: 'BR',
        userName: 'user',
        bill: dummyBill,
        resourceContent: {
          status: 'PAID',
          vehicle: { vehicleNumber: '123' },
          auditHistory: [],
        },
        externalContent: null,
        printedCopyCount: 0,
      };

      await cancelReceipt(receipt, 'Double entry mistake');
      assert.ok(putInner);
      assert.equal(putInner?.status, 'CANCELLED');
      const lastAudit = putInner?.auditHistory.at(-1);
      assert.equal(lastAudit?.action, 'CANCELLED');
      assert.equal(lastAudit?.reason, 'Double entry mistake');
    });
  });

  describe('Receipt Correction (correctReceipt)', () => {
    const dummyBill: SavedBill = {
      id: 'B10',
      receiptNumber: 'BR.10',
      createdAt: '2026-10-31T00:00:00Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: { id: 'V1', vehicleNumber: 'Ba 1 Ja 9999', vehicleType: 'Taxi', ownerName: 'Deepak Thapa', phone: '980', address: 'Ktm' },
        branch: { id: '1', name: 'BR', BranchCode: 'BR', address: '', phone: '', contactPerson: '' },
        fiscalYearId: 'FY1',
        fiscalYearName: '2081/82',
        billingDate: '2081-04-01',
        periodStart: '2081-04-01',
        periodEnd: '2081-04-30',
        billingMonths: 1,
        items: [{ title: 'Dues', amount: 500, feeHeadId: '1', billingEntityId: '1', billingEntity: 'E', ruleId: null }],
        subtotal: 500,
        discount: 50,
        total: 450,
        paymentMethod: 'नगद',
        note: '',
      },
    };

    const baseReceipt: ReceiptRecord = {
      id: 'B10',
      billingType: 'MEMBERSHIP',
      customerPhone: '980',
      customerPanNumber: '',
      receiptNumber: 'BR.10',
      fiscalYear: '2081/82',
      vehicleNumber: 'Ba 1 Ja 9999',
      finalDigits: '9999',
      customerName: 'Deepak Thapa',
      organizationName: 'Org',
      billingDate: '2081-04-01',
      paymentDate: '2081-04-01',
      validUntil: '2081-04-30',
      paymentMethod: 'नगद',
      status: 'PAID',
      totalAmount: 450,
      branchName: 'BR',
      userName: 'user',
      bill: dummyBill,
      resourceContent: {
        vehicle: { vehicleNumber: 'Ba 1 Ja 9999', ownerName: 'Deepak Thapa' },
        discount: 50,
        auditHistory: [],
      },
      externalContent: null,
      printedCopyCount: 0,
    };

    test('validates correction reason and required fields', async () => {
      const correction: ReceiptCorrection = {
        billingDate: '2081-04-10',
        periodStart: '2081-04-01',
        periodEnd: '2081-04-30',
        paymentMethod: 'नगद',
        items: [{ title: 'Fee', amount: 500, feeHeadId: '1', billingEntityId: '1', billingEntity: 'E', ruleId: null }],
        note: 'Corrected payment date',
      };

      await assert.rejects(
        () => correctReceipt(baseReceipt, correction, '  '),
        /रसिद सुधार गर्ने कारण लेख्नुहोस्।/,
      );

      await assert.rejects(
        () => correctReceipt(baseReceipt, { ...correction, billingDate: '' }, 'Reason'),
        /भुक्तानी विधि र सबै मितिहरू आवश्यक छन्।/,
      );

      await assert.rejects(
        () => correctReceipt(baseReceipt, { ...correction, periodStart: '2081-05-01', periodEnd: '2081-04-01' }, 'Reason'),
        /सेवा सुरु मिति समाप्ति मितिभन्दा पछि हुन मिल्दैन।/,
      );

      await assert.rejects(
        () => correctReceipt(baseReceipt, { ...correction, items: [] }, 'Reason'),
        /कम्तीमा एउटा शुल्क शीर्षक आवश्यक छ।/,
      );

      await assert.rejects(
        () => correctReceipt(baseReceipt, { ...correction, items: [{ ...correction.items[0], amount: -10 }] }, 'Reason'),
        /शुल्क शीर्षक र मान्य रकम आवश्यक छन्।/,
      );
    });

    test('preserves vehicle number and owner name immutable during correction', async () => {
      let putInner: {
        vehicle: { vehicleNumber: string; ownerName: string };
        billingDate: string;
        paymentMethod: string;
        subtotal: number;
        total: number;
        note: string;
        auditHistory: Array<{ action: string; reason: string }>;
      } | undefined;

      apiClient.put = async <T>(_url: string, body?: unknown): Promise<T> => {
        const parsed = body as { inner_content: typeof putInner };
        putInner = parsed?.inner_content;
        return undefined as unknown as T;
      };

      const correction: ReceiptCorrection = {
        billingDate: '2081-04-10',
        periodStart: '2081-04-01',
        periodEnd: '2081-04-30',
        paymentMethod: 'बैंक',
        items: [
          { title: 'Corrected Fee', amount: 1000, feeHeadId: '1', billingEntityId: '1', billingEntity: 'E', ruleId: null },
        ],
        note: 'Changed payment method to Bank',
      };

      await correctReceipt(baseReceipt, correction, 'Clerical correction');
      assert.ok(putInner);
      assert.equal(putInner?.vehicle.vehicleNumber, 'Ba 1 Ja 9999');
      assert.equal(putInner?.vehicle.ownerName, 'Deepak Thapa');
      assert.equal(putInner?.billingDate, '2081-04-10');
      assert.equal(putInner?.paymentMethod, 'बैंक');
      assert.equal(putInner?.subtotal, 1000);
      assert.equal(putInner?.total, 950);
      assert.equal(putInner?.note, 'Changed payment method to Bank');
      const lastAudit = putInner?.auditHistory.at(-1);
      assert.equal(lastAudit?.action, 'CORRECTED');
      assert.equal(lastAudit?.reason, 'Clerical correction');
    });
  });
});
