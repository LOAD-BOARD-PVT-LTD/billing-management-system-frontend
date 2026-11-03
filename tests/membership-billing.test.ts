import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { searchTqmsVehicles } from '@/features/billing/api/tqms-vehicle-search.api';
import { parseTqmsVehicleSearchResponse } from '@/features/billing/schemas/tqms-vehicle-search.schema';
import { matchesTqmsSanghBranch } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import { findDuplicateBillItems } from '@/features/billing/utils/duplicate-bill-check';
import { buildBillResourceContent } from '@/features/billing/api/bill-resource.api';
import { getBillValidationMessages } from '@/features/billing/utils/bill-validation';
import { apiClient } from '@/lib/api/client';
import type { BillingLine, BillingVehicle } from '@/features/billing/model/types';
import type { BillDetails, MembershipBillInput } from '@/features/billing/model/bill.types';

describe('2. Membership Billing Flow & Rules', () => {
  const originalPost = apiClient.post;
  afterEach(() => {
    apiClient.post = originalPost;
  });

  describe('TQMS Vehicle Search', () => {
    test('sends active status and vehicle number in search payload', async () => {
      let capturedPayload: unknown;
      apiClient.post = async <T>(_url: string, body?: unknown): Promise<T> => {
        capturedPayload = body;
        return [
          {
            VehicleId: 'V101',
            VehicleNumber: 'Ba 1 Ja 1234',
            VehicleType: 'Taxi',
            Owners: [{ Name: 'Ram Bahadur', Phone: '9800000000', SanghBranch: 'Kathmandu', Type: 'Main Owner' }],
          },
        ] as unknown as T;
      };

      const vehicles = await searchTqmsVehicles('Ba 1 Ja 1234');
      assert.deepEqual(capturedPayload, { vehicle_number: 'Ba 1 Ja 1234', status: 'ACTIVE' });
      assert.equal(vehicles.length, 1);
      assert.equal(vehicles[0].vehicleNumber, 'Ba 1 Ja 1234');
      assert.equal(vehicles[0].ownerName, 'Ram Bahadur');
      assert.equal(vehicles[0].branch, 'Kathmandu');
    });

    test('uses the owner marked isDhani for name and contact details, regardless of TQMS owner order', () => {
      const [vehicle] = parseTqmsVehicleSearchResponse([{
        VehicleId: 'V102',
        VehicleNumber: 'Ba 1 Ja 5678',
        VehicleType: 'Taxi',
        Owners: [
          {
            Name: 'Operator Name',
            Phone: '9800000001',
            Address: 'Operator Address',
            SanghBranch: 'Operator Branch',
            isSanchalk: true,
          },
          {
            Name: 'Dhani Name',
            Phone: '9800000002',
            Address: 'Dhani Address',
            SanghBranch: 'Dhani Branch',
            isDhani: true,
          },
        ],
      }], '5678');

      assert.equal(vehicle.ownerName, 'Dhani Name');
      assert.equal(vehicle.operatorName, 'Operator Name');
      assert.equal(vehicle.phone, '9800000002');
      assert.equal(vehicle.ownerAddress, 'Dhani Address');
      assert.equal(vehicle.branch, 'Dhani Branch');
    });

    test('uses one owner marked as both dhani and sanchalak as the sole dhani', () => {
      const [vehicle] = parseTqmsVehicleSearchResponse([{
        VehicleId: 'V103',
        VehicleNumber: 'Ba 1 Ja 7890',
        VehicleType: 'Taxi',
        Owners: [{
          Name: 'Single Dhani',
          Phone: '9800000003',
          Address: 'Single Address',
          SanghBranch: 'Single Branch',
          isDhani: true,
          isSanchalk: true,
        }],
      }], '7890');

      assert.equal(vehicle.ownerName, 'Single Dhani');
      assert.equal(vehicle.operatorName, 'Single Dhani');
      assert.equal(vehicle.phone, '9800000003');
      assert.equal(vehicle.ownerAddress, 'Single Address');
      assert.equal(vehicle.branch, 'Single Branch');
    });

    test('returns empty array without calling API when vehicle number is blank', async () => {
      let called = false;
      apiClient.post = async <T>(): Promise<T> => {
        called = true;
        return [] as unknown as T;
      };

      const result = await searchTqmsVehicles('   ');
      assert.equal(called, false);
      assert.deepEqual(result, []);
    });

    test('parses nested data responses from different API envelope structures', () => {
      const nestedEnvelope = {
        data: {
          items: [
            {
              VehicleId: 55,
              VehicleNumber: 'Na 2 Kha 9999',
              VehicleType: 'Bus',
              Owners: [{ Name: 'Hari', SanghBranch: 'Pokhara' }],
            },
          ],
        },
      };

      const parsed = parseTqmsVehicleSearchResponse(nestedEnvelope, '9999');
      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].id, '55');
      assert.equal(parsed[0].vehicleNumber, 'Na 2 Kha 9999');
    });

    test('uses the main owner as member and keeps a distinct first owner as operator', () => {
      const parsed = parseTqmsVehicleSearchResponse([{
        VehicleId: 'V201',
        VehicleNumber: 'Ba 1 Ja 201',
        Owners: [
          { Name: 'Operator Name', Type: 'Operator', Phone: '9800000000' },
          { Name: 'Vehicle Owner', Type: 'Main Owner', Phone: '9811111111' },
        ],
      }], '201');

      assert.equal(parsed[0].ownerName, 'Vehicle Owner');
      assert.equal(parsed[0].operatorName, 'Operator Name');
      assert.equal(parsed[0].phone, '9811111111');
    });

    test('throws when search results payload is malformed/unsupported format', () => {
      const corruptPayload = {
        data: {
          items: [{ unexpectedKey: true }],
        },
      };

      assert.throws(
        () => parseTqmsVehicleSearchResponse(corruptPayload, '1234'),
        /TQMS vehicle search returned results in an unsupported format/,
      );
    });
  });

  describe('TQMS Sangh Branch Filtering', () => {
    test('blank filter matches all branches', () => {
      assert.equal(matchesTqmsSanghBranch('Kathmandu', ''), true);
      assert.equal(matchesTqmsSanghBranch('Pokhara', '   '), true);
    });

    test('exact and case-insensitive matching with whitespace trimming', () => {
      assert.equal(matchesTqmsSanghBranch('Chitwan', 'chitwan'), true);
      assert.equal(matchesTqmsSanghBranch('  Chitwan  ', 'CHITWAN'), true);
      assert.equal(matchesTqmsSanghBranch('Chitwan', 'Pokhara'), false);
    });

    test('matches within semicolon or comma-separated branch lists', () => {
      assert.equal(matchesTqmsSanghBranch('Kathmandu; Pokhara, Chitwan', 'pokhara'), true);
      assert.equal(matchesTqmsSanghBranch('Kathmandu; Pokhara, Chitwan', 'chitwan'), true);
      assert.equal(matchesTqmsSanghBranch('Kathmandu; Pokhara, Chitwan', 'Biratnagar'), false);
    });

    test('matches the configured branch within an unstructured multi-branch value', () => {
      assert.equal(matchesTqmsSanghBranch('Hetauda / Birgunj and Kathmandu', 'birgunj'), true);
      assert.equal(matchesTqmsSanghBranch('Hetauda / Birgunj and Kathmandu', 'pokhara'), false);
    });

    test('uses the vehicle owner branch when owners have different branches', () => {
      const vehiclePayload = {
        VehicleId: 'V1',
        VehicleNumber: 'Ba 1 Ja 500',
        Owners: [
          { Name: 'Operator', SanghBranch: 'Hetauda', isSanchalk: true },
          { Name: 'Dhani', SanghBranch: 'Birgunj', isDhani: true },
        ],
      };
      const parsed = parseTqmsVehicleSearchResponse([vehiclePayload], '500');
      assert.equal(parsed[0].branch, 'Birgunj');
      assert.equal(matchesTqmsSanghBranch(parsed[0].branch, 'hetauda'), false);
      assert.equal(matchesTqmsSanghBranch(parsed[0].branch, 'birgunj'), true);
      assert.equal(matchesTqmsSanghBranch(parsed[0].branch, 'kathmandu'), false);
    });
  });

  describe('Bill Validation Rules (getBillValidationMessages)', () => {
    const validVehicle: BillingVehicle = {
      id: 'V100',
      tqmsVehicleId: 'V100',
      tqmsVehicleTypeId: 'T1',
      vehicleNumber: 'Ba 2 Kha 4321',
      vehicleType: 'Microbus',
      ownerName: 'Shyam Shrestha',
      phone: '9841234567',
      smsPhone: '9841234567',
      ownerAddress: 'Kathmandu',
      branch: 'Kathmandu',
      fiscalYear: '',
      billingDate: '2081-05-01',
      periodStart: '2081-05-01',
      periodEnd: '2081-05-30',
      billingMonths: 1,
      company: '',
      companyShare: '',
      rate: '',
      rateDate: '',
      previousPeriod: '',
      remainingPeriod: '',
      resourceContent: {},
    };

    const validDetails: BillDetails = {
      branchId: 'BR-1',
      branchName: 'Kathmandu Branch',
      branchCode: 'KTM',
      branchAddress: 'Teku',
      branchPhone: '01-4123456',
      branchContactPerson: 'Manager',
      allowManualReceiptAmountOverride: false,
      fiscalYearId: 'FY-8182',
      fiscalYearName: '2081/82',
      billingDate: '2081-05-01',
      periodStart: '2081-05-01',
      periodEnd: '2081-05-30',
      billingMonths: 1,
    };

    const validItems: BillingLine[] = [
      {
        id: 'L1',
        title: 'Monthly Subscription',
        amount: 1000,
        entity: 'Main Association',
        entityId: 'ENT-1',
        feeHeadId: 'FH-1',
      },
    ];

    const baseValidationInput = {
      vehicle: validVehicle,
      details: validDetails,
      items: validItems,
      activeBillingEntityIds: new Set(['ENT-1']),
      subtotal: 1000,
      discount: 0,
      isLoadingRules: false,
      isLoadingLinkedFeeRules: false,
      linkedFeeRulesError: null,
      hasPeriodicBillingRule: true,
      billingMonths: 1,
      ruleAmounts: { L1: 1000 },
      isCheckingBlacklist: false,
      blacklistError: null,
      isBlacklisted: false,
    };

    test('passes with no error messages for valid input', () => {
      const messages = getBillValidationMessages(baseValidationInput);
      assert.deepEqual(messages, []);
    });

    test('blocks if vehicle is missing', () => {
      const messages = getBillValidationMessages({ ...baseValidationInput, vehicle: null });
      assert.ok(messages.includes('पहिले सवारी छान्नुहोस्।'));
    });

    test('blocks if vehicle is checking blacklist, has error, or is blacklisted', () => {
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, isCheckingBlacklist: true })
          .includes('सवारीको कालोसूची अवस्था जाँच हुँदैछ।'),
      );
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, blacklistError: 'Network down' })
          .includes('कालोसूची अवस्था जाँच गर्न सकिएन: Network down'),
      );
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, isBlacklisted: true })
          .includes('यो सवारी कालोसूचीमा छ। यसका लागि बिल बनाउन मिल्दैन।'),
      );
    });

    test('blocks if branch code is missing or empty', () => {
      const messages = getBillValidationMessages({
        ...baseValidationInput,
        details: { ...validDetails, branchCode: '   ' },
      });
      assert.ok(messages.some((msg) => msg.includes('शाखाको कोड उपलब्ध छैन')));
    });

    test('blocks if period start is after period end', () => {
      const messages = getBillValidationMessages({
        ...baseValidationInput,
        details: { ...validDetails, periodStart: '2081-06-01', periodEnd: '2081-05-01' },
      });
      assert.ok(messages.includes('अवधिको सुरु मिति अन्त्य मितिभन्दा पछि हुन मिल्दैन।'));
    });

    test('validates billing months for periodic rules (must be integer 1 to 12)', () => {
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, billingMonths: 0 })
          .some((msg) => msg.includes('१ देखि १२ सम्मको बिलिङ महिना छान्नुहोस्')),
      );
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, billingMonths: 13 })
          .some((msg) => msg.includes('१ देखि १२ सम्मको बिलिङ महिना छान्नुहोस्')),
      );
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, billingMonths: 2.5 })
          .some((msg) => msg.includes('१ देखि १२ सम्मको बिलिङ महिना छान्नुहोस्')),
      );
    });

    test('blocks when items list is empty', () => {
      const messages = getBillValidationMessages({
        ...baseValidationInput,
        items: [],
        subtotal: 0,
      });
      assert.ok(messages.some((msg) => msg.includes('बिलमा कम्तीमा एउटा शुल्क थप्नुहोस्')));
    });

    test('blocks if item has empty title, missing entity ID, or inactive entity ID', () => {
      const invalidItem: BillingLine = {
        id: 'L1',
        title: '   ',
        amount: 500,
        entity: '',
        entityId: 'INACTIVE-ENT',
      };
      const messages = getBillValidationMessages({
        ...baseValidationInput,
        items: [invalidItem],
        subtotal: 500,
      });
      assert.ok(messages.includes('सबै शुल्कका लागि शीर्षक छान्नुहोस्।'));
      assert.ok(messages.includes('निष्क्रिय Billing Entity भएको शुल्कमा बिल बनाउन मिल्दैन। सक्रिय Billing Entity चयन गर्नुहोस्।'));
    });

    test('blocks negative item amounts', () => {
      const negativeItem: BillingLine = {
        id: 'L1',
        title: 'Refund',
        amount: -100,
        entity: 'Main',
        entityId: 'ENT-1',
      };
      const messages = getBillValidationMessages({
        ...baseValidationInput,
        items: [negativeItem],
        subtotal: -100,
      });
      assert.ok(messages.includes('शुल्क रकम शून्य वा सोभन्दा बढी हुनुपर्छ।'));
    });

    test('enforces manual amount override permission based on branch setting', () => {
      const manualItem: BillingLine = {
        id: 'L1',
        title: 'Special Fee',
        amount: 800,
        entity: 'Main',
        entityId: 'ENT-1',
        ruleId: 'L1',
        isManual: true,
      };
      const blockedMessages = getBillValidationMessages({
        ...baseValidationInput,
        details: { ...validDetails, allowManualReceiptAmountOverride: false },
        items: [manualItem],
        subtotal: 800,
      });
      assert.ok(blockedMessages.includes('चयन गरिएको शाखामा Manual Amount Override अनुमति छैन।'));

      const allowedMessages = getBillValidationMessages({
        ...baseValidationInput,
        details: { ...validDetails, allowManualReceiptAmountOverride: true },
        items: [manualItem],
        subtotal: 800,
      });
      assert.equal(allowedMessages.length, 0);
    });

    test('blocks invalid discount values: below 0 or above subtotal; allows discount equal to subtotal', () => {
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, discount: -50 })
          .includes('छुट रकम कुल रकमभन्दा बढी हुन मिल्दैन।'),
      );
      assert.ok(
        getBillValidationMessages({ ...baseValidationInput, discount: 1500, subtotal: 1000 })
          .includes('छुट रकम कुल रकमभन्दा बढी हुन मिल्दैन।'),
      );
      const messagesEqual = getBillValidationMessages({ ...baseValidationInput, discount: 1000, subtotal: 1000 });
      assert.equal(messagesEqual.length, 0);
    });
  });

  describe('Duplicate Bill Check (findDuplicateBillItems)', () => {
    const newBill = {
      vehicle: { id: 'V1', vehicleNumber: 'Ba 1 Ja 100', vehicleType: 'Taxi', ownerName: 'Ram', phone: '980', address: 'Ktm' },
      branch: { id: 'B1', name: 'Kathmandu', BranchCode: 'KTM', address: 'Ktm', phone: '01', contactPerson: 'Mgr' },
      fiscalYearId: 'FY8182',
      periodStart: '2081-01-01',
      periodEnd: '2081-01-30',
      items: [
        { feeHeadId: 'FH-1', billingEntityId: 'ENT-1', billingEntity: 'Sangh', ruleId: 'R-1', amount: 500, title: 'Monthly Dues' },
      ],
    };

    test('detects duplicate when vehicle, branch, fiscal year, period, and fee item match', () => {
      const existingBills = [
        {
          id: 'BILL-99',
          receiptNumber: 'KTM.99',
          vehicleNumber: 'Ba 1 Ja 100',
          branchName: 'Kathmandu',
          bill: {
            content: {
              vehicle: { id: 'V1', vehicleNumber: 'Ba 1 Ja 100', vehicleType: 'Taxi', ownerName: 'Ram', phone: '980', address: 'Ktm' },
              branch: { id: 'B1', name: 'Kathmandu', BranchCode: 'KTM', address: 'Ktm', phone: '01', contactPerson: 'Mgr' },
              fiscalYearId: 'FY8182',
              fiscalYearName: '2081/82',
              periodStart: '2081-01-01',
              periodEnd: '2081-01-30',
              billingDate: '2081-01-02',
              billingMonths: 1,
              items: [
                { feeHeadId: 'FH-1', billingEntityId: 'ENT-1', billingEntity: 'Sangh', ruleId: 'R-1', amount: 500, title: 'Monthly Dues' },
              ],
              subtotal: 500,
              discount: 0,
              total: 500,
              paymentMethod: 'नगद',
              note: '',
            },
          },
        },
      ];

      const duplicates = findDuplicateBillItems(newBill, existingBills);
      assert.equal(duplicates.length, 1);
      assert.equal(duplicates[0].existingBillId, 'BILL-99');
      assert.equal(duplicates[0].receiptNumber, 'KTM.99');
      assert.equal(duplicates[0].feeHeadId, 'FH-1');
      assert.equal(duplicates[0].existingAmount, 500);
    });

    test('does not detect duplicate when billing periods differ', () => {
      const existingBills = [
        {
          id: 'BILL-99',
          bill: {
            content: {
              vehicle: { id: 'V1', vehicleNumber: 'Ba 1 Ja 100', vehicleType: 'Taxi', ownerName: 'Ram', phone: '980', address: 'Ktm' },
              branch: { id: 'B1', name: 'Kathmandu', BranchCode: 'KTM', address: 'Ktm', phone: '01', contactPerson: 'Mgr' },
              fiscalYearId: 'FY8182',
              fiscalYearName: '2081/82',
              periodStart: '2081-02-01',
              periodEnd: '2081-02-30',
              billingDate: '2081-02-02',
              billingMonths: 1,
              items: [
                { feeHeadId: 'FH-1', billingEntityId: 'ENT-1', billingEntity: 'Sangh', ruleId: 'R-1', amount: 500, title: 'Monthly Dues' },
              ],
              subtotal: 500,
              discount: 0,
              total: 500,
              paymentMethod: 'नगद',
              note: '',
            },
          },
        },
      ];

      const duplicates = findDuplicateBillItems(newBill, existingBills);
      assert.equal(duplicates.length, 0);
    });

    test('does not detect duplicate when fee heads differ', () => {
      const existingBills = [
        {
          id: 'BILL-99',
          bill: {
            content: {
              vehicle: { id: 'V1', vehicleNumber: 'Ba 1 Ja 100', vehicleType: 'Taxi', ownerName: 'Ram', phone: '980', address: 'Ktm' },
              branch: { id: 'B1', name: 'Kathmandu', BranchCode: 'KTM', address: 'Ktm', phone: '01', contactPerson: 'Mgr' },
              fiscalYearId: 'FY8182',
              fiscalYearName: '2081/82',
              periodStart: '2081-01-01',
              periodEnd: '2081-01-30',
              billingDate: '2081-01-02',
              billingMonths: 1,
              items: [
                { feeHeadId: 'FH-DIFFERENT', billingEntityId: 'ENT-1', billingEntity: 'Sangh', ruleId: 'R-1', amount: 500, title: 'Other' },
              ],
              subtotal: 500,
              discount: 0,
              total: 500,
              paymentMethod: 'नगद',
              note: '',
            },
          },
        },
      ];

      const duplicates = findDuplicateBillItems(newBill, existingBills);
      assert.equal(duplicates.length, 0);
    });
  });

  describe('Bill Payload Construction (buildBillResourceContent)', () => {
    test('builds complete membership BillResourcePayload with correct fields and totals', () => {
      const vehicle: BillingVehicle = {
        id: 'V909',
        tqmsVehicleId: 'V909',
        tqmsVehicleTypeId: 'T1',
        vehicleNumber: 'Ba 3 Kha 5555',
        vehicleType: 'Truck',
        ownerName: 'Bikash Rai',
        operatorName: 'Hari Driver',
        route: 'Bagmati Province (P3), Kathmandu',
        phone: '9811111111',
        smsPhone: '9811111111',
        ownerAddress: 'Bharatpur',
        branch: 'Narayangarh',
        fiscalYear: '',
        billingDate: '',
        periodStart: '',
        periodEnd: '',
        billingMonths: 0,
        company: '',
        companyShare: '',
        rate: '',
        rateDate: '',
        previousPeriod: '',
        remainingPeriod: '',
        resourceContent: {},
      };

      const input: MembershipBillInput = {
        billingType: 'MEMBERSHIP',
        vehicle,
        details: {
          branchId: 'BR-10',
          branchName: 'Narayangarh Branch',
          branchCode: 'NAR',
          branchAddress: 'Narayangarh',
          branchPhone: '056-520000',
          branchContactPerson: 'Shiva',
          allowManualReceiptAmountOverride: false,
          fiscalYearId: 'FY-8182',
          fiscalYearName: '2081/82',
          billingDate: '2081-04-15',
          periodStart: '2081-04-01',
          periodEnd: '2081-04-30',
          billingMonths: 1,
        },
        items: [
          {
            id: 'item-1',
            feeHeadId: 'FH-10',
            title: 'Sangh Membership',
            entityId: 'ENT-5',
            entity: 'Sangh Chitwan',
            ruleId: 'RULE-1',
            amount: 1500,
          },
        ],
        subtotal: 1500,
        discount: 200,
        paymentMethod: 'नगद',
        note: 'Member paid on time',
        createdBy: {
          id: 'USER-1',
          name: 'Accountant',
          username: 'accountant@sangh.org',
        },
      };

      const payload = buildBillResourceContent(input);
      assert.equal(payload.billingType, 'MEMBERSHIP');
      assert.equal(payload.vehicle.vehicleNumber, 'Ba 3 Kha 5555');
      assert.equal(payload.vehicle.ownerName, 'Bikash Rai');
      assert.equal(payload.vehicle.operatorName, 'Hari Driver');
      assert.equal(payload.vehicle.route, 'Bagmati Province (P3), Kathmandu');
      assert.equal(payload.vehicle.smsPhone, '9811111111');
      assert.equal(payload.branch.id, 'BR-10');
      assert.equal(payload.branch.BranchCode, 'NAR');
      assert.equal(payload.fiscalYearId, 'FY-8182');
      assert.equal(payload.billingDate, '2081-04-15');
      assert.equal(payload.subtotal, 1500);
      assert.equal(payload.discount, 200);
      assert.equal(payload.total, 1300);
      assert.equal(payload.paymentMethod, 'नगद');
      assert.equal(payload.note, 'Member paid on time');
      assert.equal(payload.createdBy?.name, 'Accountant');
      assert.equal(payload.items.length, 1);
      assert.equal(payload.items[0].title, 'Sangh Membership');
      assert.equal(payload.items[0].amount, 1500);
    });

    test('creates a new bill with only one owner name when TQMS marks that owner in both roles', () => {
      const vehicle: BillingVehicle = {
        id: 'V910',
        tqmsVehicleId: 'V910',
        tqmsVehicleTypeId: 'T1',
        vehicleNumber: 'Ba 3 Kha 5556',
        vehicleType: 'Truck',
        ownerName: 'Single Owner',
        operatorName: ' single owner ',
        phone: '9811111111',
        smsPhone: '9811111111',
        ownerAddress: 'Bharatpur',
        branch: 'Narayangarh',
        fiscalYear: '',
        billingDate: '',
        periodStart: '',
        periodEnd: '',
        billingMonths: 0,
        company: '',
        companyShare: '',
        rate: '',
        rateDate: '',
        previousPeriod: '',
        remainingPeriod: '',
        resourceContent: {},
      };
      const input: MembershipBillInput = {
        billingType: 'MEMBERSHIP',
        vehicle,
        details: {
          branchId: 'BR-10',
          branchName: 'Narayangarh Branch',
          branchCode: 'NAR',
          branchAddress: 'Narayangarh',
          branchPhone: '056-520000',
          branchContactPerson: 'Shiva',
          allowManualReceiptAmountOverride: false,
          fiscalYearId: 'FY-8182',
          fiscalYearName: '2081/82',
          billingDate: '2081-04-15',
          periodStart: '2081-04-01',
          periodEnd: '2081-04-30',
          billingMonths: 1,
        },
        items: [],
        subtotal: 0,
        discount: 0,
        paymentMethod: 'नगद',
        note: '',
      };

      const payload = buildBillResourceContent(input);
      assert.equal(payload.vehicle.ownerName, 'Single Owner');
      assert.equal('operatorName' in payload.vehicle, false);
    });
  });
});
