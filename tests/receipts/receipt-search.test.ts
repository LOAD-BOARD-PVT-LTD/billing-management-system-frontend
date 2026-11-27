import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { ReceiptRecord } from '@/features/receipts/model/receipt';
import {
  buildReceiptSearchIndex,
  filterReceiptRecords,
  matchesReceiptSearch,
} from '@/features/receipts/utils/receipt-search';
import { createTestReceipt } from '@/tests/helpers/fixtures';

function buildSampleReceipts(): ReceiptRecord[] {
  const nepaliOwnerReceipt = createTestReceipt('101', {
    receiptNumber: 'CIT.101',
    vehicleNumber: 'ME-12-PHA-1213',
    finalDigits: '1213',
    customerName: 'राम बहादुर थापा',
    customerPhone: '9845001122',
    branchName: 'चितवन शाखा',
    userName: 'sita@narayanisangh.com',
    fiscalYear: '2083/84',
    billingDate: '2026-11-10',
    paymentDate: '2026-11-10',
    validUntil: '2026-12-09',
    paymentMethod: 'बैंक',
    status: 'PAID',
    totalAmount: 3500,
    resourceContent: {
      vehicle: {
        Owners: [
          { Name: 'हरि कृष्ण श्रेष्ठ', Type: 'Operator' },
          { OwnerName: 'राम बहादुर थापा', Type: 'Main Owner' },
        ],
      },
    },
  });
  nepaliOwnerReceipt.bill.content.vehicle.ownerName = 'राम बहादुर थापा';
  nepaliOwnerReceipt.bill.content.vehicle.operatorName = 'हरि कृष्ण श्रेष्ठ';
  nepaliOwnerReceipt.bill.content.vehicle.vehicleType = 'Truck 10T';
  nepaliOwnerReceipt.bill.content.vehicle.route = 'नारायणगढ - काठमाडौं';
  nepaliOwnerReceipt.bill.content.vehicle.address = 'भरतपुर-१०';
  nepaliOwnerReceipt.bill.content.vehicle.smsPhone = '9800009999';
  nepaliOwnerReceipt.bill.content.branch.BranchCode = 'CIT';
  nepaliOwnerReceipt.bill.content.createdBy = {
    id: 'u-sita',
    name: 'Sita Sharma',
    username: 'sita@narayanisangh.com',
  };
  nepaliOwnerReceipt.bill.content.note = 'वार्षिक नवीकरण बापत';
  nepaliOwnerReceipt.bill.content.items = [
    {
      feeHeadId: 'fh-1',
      title: 'सदस्यता शुल्क',
      billingEntityId: 'be-1',
      billingEntity: 'नारायणी संघ',
      ruleId: 'r-1',
      amount: 3500,
    },
  ];

  const englishOwnerReceipt = createTestReceipt('205', {
    receiptNumber: 'KTM.205',
    vehicleNumber: 'BA 01 KHA 9988',
    finalDigits: '9988',
    customerName: 'Ramesh Adhikari',
    customerPhone: '9841223344',
    branchName: 'मुख्य कार्यालय (हेटौंडा)',
    userName: 'Admin',
    fiscalYear: '2082/83',
    billingDate: '2026-03-15',
    paymentDate: '2026-03-15',
    validUntil: '2026-04-14',
    paymentMethod: 'नगद',
    status: 'CANCELLED',
    totalAmount: 1850,
  });
  englishOwnerReceipt.bill.content.vehicle.ownerName = 'Ramesh Adhikari';
  englishOwnerReceipt.bill.content.vehicle.operatorName = 'Deepak Magar';
  englishOwnerReceipt.bill.content.branch.BranchCode = 'KTM';

  const generalReceipt = createTestReceipt('309', {
    billingType: 'GENERAL',
    receiptNumber: 'POK.309',
    vehicleNumber: '',
    finalDigits: '',
    customerName: 'Sagar Hardware Traders',
    customerPhone: '9856007788',
    customerPanNumber: '601234567',
    organizationName: 'Sagar Hardware Traders',
    branchName: 'पोखरा शाखा',
    userName: 'Pokhara Operator',
    fiscalYear: '2083/84',
    billingDate: '2026-11-18',
    paymentDate: '2026-11-18',
    validUntil: '',
    paymentMethod: 'चेक',
    status: 'PENDING',
    totalAmount: 4750,
  });
  generalReceipt.bill.content.billingType = 'GENERAL';
  generalReceipt.bill.content.customer = {
    name: 'Sagar Hardware Traders',
    phone: '9856007788',
    address: 'पृथ्वीचोक, पोखरा',
    panNumber: '601234567',
  };
  generalReceipt.bill.content.branch.BranchCode = 'POK';
  generalReceipt.bill.content.note = 'काउन्टर स्टेशनरी बिल';
  generalReceipt.bill.content.items = [
    {
      feeHeadId: 'fh-9',
      title: 'विविध शुल्क',
      billingEntityId: 'be-2',
      billingEntity: 'पोखरा समिति',
      ruleId: null,
      amount: 4750,
    },
  ];

  return [nepaliOwnerReceipt, englishOwnerReceipt, generalReceipt];
}

describe('Receipt search and general filtering', () => {
  it('matches vehicle owner name in Nepali Devanagari and English while preserving Devanagari matras', () => {
    const [nepaliReceipt, englishReceipt] = buildSampleReceipts();

    assert.equal(matchesReceiptSearch(nepaliReceipt, 'राम बहादुर'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'थापा'), true);
    // Must not strip vowel matra (ा) and falsely match रमेश with राम
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'रमेश'), false);

    assert.equal(matchesReceiptSearch(englishReceipt, 'ramesh adhikari'), true);
    assert.equal(matchesReceiptSearch(englishReceipt, '  ADHIKARI  '), true);
  });

  it('matches operator name (संचालक) and legacy owner names on multi-owner receipts', () => {
    const [nepaliReceipt, englishReceipt] = buildSampleReceipts();

    assert.equal(matchesReceiptSearch(nepaliReceipt, 'हरि कृष्ण'), true);
    assert.equal(matchesReceiptSearch(englishReceipt, 'Deepak Magar'), true);
  });

  it('matches receipt numbers across English digits, Nepali digits, punctuation variants, and fiscal year format', () => {
    const [nepaliReceipt] = buildSampleReceipts();

    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT.101'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT.१०१'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, '१०१'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT 101'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT-101'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT101'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT.101 (२०८३/८४)'), true);
  });

  it('matches combined multi-term queries such as vehicle owner name and receipt number in any order', () => {
    const [nepaliReceipt, englishReceipt] = buildSampleReceipts();

    assert.equal(matchesReceiptSearch(nepaliReceipt, 'राम बहादुर CIT.101'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'राम बहादुर CIT.१०१'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'CIT.101 राम बहादुर'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'राम बहादुर, १०१'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'ME 12 PHA 1213 राम बहादुर'), true);
    assert.equal(matchesReceiptSearch(englishReceipt, 'Ramesh KTM-205'), true);

    // Non-matching second token rejects the record
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'राम बहादुर CIT.999'), false);
  });

  it('handles copy-pasted UI table prefixes and vehicle number formatting variants', () => {
    const [nepaliReceipt] = buildSampleReceipts();

    assert.equal(matchesReceiptSearch(nepaliReceipt, 'धनीको नाम: राम बहादुर थापा'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'संचालक: हरि कृष्ण श्रेष्ठ'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'रुट: नारायणगढ'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'ME12PHA1213'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'ME 12 PHA १२१३'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, '१२१३'), true);
  });

  it('supports general search across सामान्य बिल and membership fields (phone, PAN, note, status, branch, user, fee head, date, amount)', () => {
    const [nepaliReceipt, englishReceipt, generalReceipt] = buildSampleReceipts();

    // General receipt fields
    assert.equal(matchesReceiptSearch(generalReceipt, 'Sagar Hardware'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'सामान्य बिल'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, '601234567'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, '६०१२३४५६७'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'पृथ्वीचोक'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'विविध शुल्क'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'काउन्टर स्टेशनरी'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'चेक'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, 'बाँकी'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, '4750'), true);
    assert.equal(matchesReceiptSearch(generalReceipt, '४,७५०'), true);

    // Membership receipt additional general fields
    assert.equal(matchesReceiptSearch(nepaliReceipt, '9800009999'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'Sita Sharma'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'चितवन शाखा'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'भुक्तानी'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'Truck 10T'), true);
    assert.equal(matchesReceiptSearch(nepaliReceipt, 'नवीकरण'), true);
    assert.equal(matchesReceiptSearch(englishReceipt, 'रद्द'), true);
  });

  it('combines search with fiscalYear, branch, user alias, status, and date filters via filterReceiptRecords', () => {
    const records = buildSampleReceipts();
    const systemUsers = [{ name: 'Sita Sharma', email: 'sita@narayanisangh.com' }];
    const searchIndexMap = new Map(records.map((r) => [r, buildReceiptSearchIndex(r)]));

    const matched = filterReceiptRecords({
      records,
      fiscalYear: '२०८३/८४',
      systemUsers,
      searchIndexMap,
      filters: {
        search: 'राम बहादुर CIT.१०१',
        dateFrom: '2026-11-01',
        dateTo: '2026-11-30',
        branch: 'चितवन शाखा',
        user: 'Sita Sharma',
        status: 'PAID',
      },
    });

    assert.equal(matched.length, 1);
    assert.equal(matched[0].id, '101');

    const statusMismatch = filterReceiptRecords({
      records,
      fiscalYear: 'all',
      systemUsers,
      searchIndexMap,
      filters: {
        search: 'राम बहादुर CIT.101',
        dateFrom: '',
        dateTo: '',
        branch: 'all',
        user: 'all',
        status: 'CANCELLED',
      },
    });
    assert.equal(statusMismatch.length, 0);
  });
});
