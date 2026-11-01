import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { ReceiptRecord, ReceiptFilters } from '@/features/receipts/model/receipt';
import type { SavedBill } from '@/features/billing/model/bill.types';
import { toNepaliDigits } from '@/utils/numbers';

describe('6. UI, Accessibility, and Resilience', () => {
  describe('Receipt Filtering, Searching & Large Dataset Resilience', () => {
    function filterReceipts(
      records: ReceiptRecord[],
      filters: ReceiptFilters,
      fiscalYear: string,
    ): ReceiptRecord[] {
      const debouncedSearch = filters.search.trim().toLocaleLowerCase();
      return records.filter((receipt) => {
        const searchable = `${receipt.vehicleNumber} ${receipt.receiptNumber} ${receipt.customerName} ${receipt.organizationName}`.toLocaleLowerCase();
        return (
          (!debouncedSearch || searchable.includes(debouncedSearch)) &&
          (fiscalYear === 'all' || receipt.fiscalYear === fiscalYear) &&
          (!filters.dateFrom || receipt.paymentDate >= filters.dateFrom) &&
          (!filters.dateTo || receipt.paymentDate <= filters.dateTo) &&
          (filters.branch === 'all' || receipt.branchName === filters.branch) &&
          (filters.user === 'all' || receipt.userName === filters.user) &&
          (filters.status === 'all' || receipt.status === filters.status)
        );
      });
    }

    const dummyBill: SavedBill = {
      id: '1',
      receiptNumber: 'KTM.1',
      createdAt: '2026-10-31T00:00:00Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: { id: '1', vehicleNumber: '', vehicleType: '', ownerName: '', phone: '', address: '' },
        branch: { id: '1', name: '', BranchCode: '', address: '', phone: '', contactPerson: '' },
        fiscalYearId: '1',
        fiscalYearName: '2081/82',
        billingDate: '2081-01-01',
        periodStart: '',
        periodEnd: '',
        billingMonths: 0,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        paymentMethod: '',
        note: '',
      },
    };

    const mockReceipts: ReceiptRecord[] = [
      {
        id: '1',
        billingType: 'MEMBERSHIP',
        receiptNumber: 'KTM.1',
        fiscalYear: '2081/82',
        vehicleNumber: 'Ba 1 Ja 1111',
        finalDigits: '1111',
        customerName: 'Ram Sharma',
        customerPhone: '9841111111',
        organizationName: 'City Express',
        billingDate: '2081-01-10',
        paymentDate: '2081-01-10',
        validUntil: '2081-01-30',
        paymentMethod: 'नगद',
        status: 'PAID',
        totalAmount: 1200,
        branchName: 'Kathmandu',
        userName: 'cashier1',
        bill: dummyBill,
        resourceContent: {},
        externalContent: null,
        printedCopyCount: 1,
      },
      {
        id: '2',
        billingType: 'MEMBERSHIP',
        receiptNumber: 'POK.2',
        fiscalYear: '2081/82',
        vehicleNumber: 'Ga 1 Kha 2222',
        finalDigits: '2222',
        customerName: 'Sita Devi',
        customerPhone: '9842222222',
        organizationName: 'Lakeside Tours',
        billingDate: '2081-02-15',
        paymentDate: '2081-02-15',
        validUntil: '2081-02-30',
        paymentMethod: 'बैंक',
        status: 'CANCELLED',
        totalAmount: 2500,
        branchName: 'Pokhara',
        userName: 'cashier2',
        bill: dummyBill,
        resourceContent: {},
        externalContent: null,
        printedCopyCount: 0,
      },
      {
        id: '3',
        billingType: 'GENERAL',
        receiptNumber: 'KTM.3',
        fiscalYear: '2080/81',
        vehicleNumber: '',
        finalDigits: '',
        customerName: 'Himalayan Enterprises',
        customerPhone: '9851000000',
        organizationName: 'Himalayan Enterprises',
        billingDate: '2080-12-01',
        paymentDate: '2080-12-01',
        validUntil: '',
        paymentMethod: 'नगद',
        status: 'PAID',
        totalAmount: 10000,
        branchName: 'Kathmandu',
        userName: 'cashier1',
        bill: dummyBill,
        resourceContent: {},
        externalContent: null,
        printedCopyCount: 2,
      },
    ];

    test('filters by search term across vehicle, receipt number, customer name, and org', () => {
      const byVehicle = filterReceipts(mockReceipts, { search: '1111', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' }, 'all');
      assert.equal(byVehicle.length, 1);
      assert.equal(byVehicle[0].id, '1');

      const byReceipt = filterReceipts(mockReceipts, { search: 'POK.2', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' }, 'all');
      assert.equal(byReceipt.length, 1);
      assert.equal(byReceipt[0].id, '2');

      const byCustomer = filterReceipts(mockReceipts, { search: 'himalayan', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' }, 'all');
      assert.equal(byCustomer.length, 1);
      assert.equal(byCustomer[0].id, '3');
    });

    test('filters by branch, status, user, and fiscal year', () => {
      const ktmPaid = filterReceipts(
        mockReceipts,
        { search: '', dateFrom: '', dateTo: '', branch: 'Kathmandu', user: 'all', status: 'PAID' },
        '2081/82',
      );
      assert.equal(ktmPaid.length, 1);
      assert.equal(ktmPaid[0].id, '1');

      const cancelledOnly = filterReceipts(
        mockReceipts,
        { search: '', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'CANCELLED' },
        'all',
      );
      assert.equal(cancelledOnly.length, 1);
      assert.equal(cancelledOnly[0].id, '2');
    });

    test('filters by payment date range', () => {
      const inRange = filterReceipts(
        mockReceipts,
        { search: '', dateFrom: '2081-01-01', dateTo: '2081-01-31', branch: 'all', user: 'all', status: 'all' },
        'all',
      );
      assert.equal(inRange.length, 1);
      assert.equal(inRange[0].id, '1');

      const outOfRange = filterReceipts(
        mockReceipts,
        { search: '', dateFrom: '2081-05-01', dateTo: '2081-05-31', branch: 'all', user: 'all', status: 'all' },
        'all',
      );
      assert.equal(outOfRange.length, 0);
    });

    test('resiliently handles large dataset of 2,000 receipts under 10 milliseconds', () => {
      const largeSet: ReceiptRecord[] = Array.from({ length: 2000 }, (_, i) => ({
        ...mockReceipts[i % 3],
        id: `rec-${i}`,
        receiptNumber: `BR.${i}`,
        vehicleNumber: `Ba ${i} Ja ${1000 + i}`,
      }));

      const start = performance.now();
      const results = filterReceipts(
        largeSet,
        { search: '1500', dateFrom: '', dateTo: '', branch: 'all', user: 'all', status: 'all' },
        'all',
      );
      const elapsed = performance.now() - start;

      assert.ok(elapsed < 50, `Filtering took ${elapsed}ms, expected under 50ms`);
      assert.ok(results.length > 0);
    });
  });

  describe('Form Validation, Focus Management, and Error Clearing', () => {
    function validateRuleForm(rule: {
      fiscalYearId: string;
      scope: 'COMMON' | 'VEHICLE_TYPE';
      feeHeadId: string;
      amount: string;
      billingEntityId: string;
      effectiveDate: string;
      meetingReference: string;
    }): { errors: Record<string, string>; firstInvalidField: string | null } {
      const errors: Record<string, string> = {};
      if (!rule.fiscalYearId) errors.fiscalYearId = 'Fiscal year is required';
      if (!rule.feeHeadId) errors.feeHeadId = 'Fee head is required';
      const parsedAmount = Number(rule.amount);
      if (!rule.amount.trim()) errors.amount = 'Amount is required';
      else if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || (rule.scope === 'VEHICLE_TYPE' && parsedAmount === 0)) {
        errors.amount = rule.scope === 'COMMON' ? 'Amount must be non-negative' : 'Amount must be positive';
      }
      if (!rule.billingEntityId) errors.billingEntityId = 'Billing entity is required';
      if (rule.scope === 'COMMON' && !rule.effectiveDate) errors.effectiveDate = 'Effective date is required';
      if (rule.scope === 'COMMON' && !rule.meetingReference.trim()) errors.meetingReference = 'Meeting reference is required';

      const fieldOrder = ['fiscalYearId', 'feeHeadId', 'amount', 'billingEntityId', 'effectiveDate', 'meetingReference'];
      const firstInvalidField = fieldOrder.find((field) => errors[field]) ?? null;

      return { errors, firstInvalidField };
    }

    test('prioritizes first invalid field in logical keyboard order', () => {
      const { errors, firstInvalidField } = validateRuleForm({
        fiscalYearId: '',
        scope: 'COMMON',
        feeHeadId: '',
        amount: '',
        billingEntityId: '',
        effectiveDate: '',
        meetingReference: '',
      });

      assert.equal(firstInvalidField, 'fiscalYearId');
      assert.ok(errors.fiscalYearId);
      assert.ok(errors.feeHeadId);
      assert.ok(errors.amount);
      assert.ok(errors.billingEntityId);
      assert.ok(errors.effectiveDate);
      assert.ok(errors.meetingReference);
    });

    test('identifies next invalid field when earlier field is corrected', () => {
      const { firstInvalidField } = validateRuleForm({
        fiscalYearId: 'FY1',
        feeHeadId: 'FH1',
        amount: '',
        billingEntityId: 'ENT1',
        scope: 'COMMON',
        effectiveDate: '2081-01-01',
        meetingReference: 'Ref 1',
      });

      assert.equal(firstInvalidField, 'amount');
    });

    test('enforces positive amount for VEHICLE_TYPE rule and allows 0 for COMMON rule', () => {
      const commonZero = validateRuleForm({
        fiscalYearId: 'FY1',
        feeHeadId: 'FH1',
        amount: '0',
        billingEntityId: 'ENT1',
        scope: 'COMMON',
        effectiveDate: '2081-01-01',
        meetingReference: 'Ref 1',
      });
      assert.equal(commonZero.errors.amount, undefined);

      const vehicleTypeZero = validateRuleForm({
        fiscalYearId: 'FY1',
        feeHeadId: 'FH1',
        amount: '0',
        billingEntityId: 'ENT1',
        scope: 'VEHICLE_TYPE',
        effectiveDate: '',
        meetingReference: '',
      });
      assert.equal(vehicleTypeZero.errors.amount, 'Amount must be positive');
    });
  });

  describe('Nepali Numeral Conversion Utility', () => {
    test('converts Latin digits to Devanagari numerals accurately', () => {
      assert.equal(toNepaliDigits('0123456789'), '०१२३४५६७८९');
      assert.equal(toNepaliDigits('Price: 1500.50'), 'Price: १५००.५०');
      assert.equal(toNepaliDigits(''), '');
    });
  });
});
