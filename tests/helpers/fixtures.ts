import type { BillingVehicle } from '@/features/billing/model/types';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

export function createTestBillingVehicle(
  overrides: Partial<BillingVehicle> = {},
): BillingVehicle {
  return {
    id: 'res-1',
    tqmsVehicleId: '101',
    tqmsVehicleTypeId: 'type-bus',
    vehicleNumber: 'BA 01 KHA 1234',
    vehicleType: 'Bus',
    operatorName: 'Hari Thapa',
    ownerName: 'Ram Bahadur',
    phone: '9841234567',
    smsPhone: '9841234567',
    ownerAddress: 'Kathmandu',
    branch: 'Lalitpur Branch, Kathmandu Branch',
    fiscalYear: '2083/84',
    billingDate: '2083-01-01',
    periodStart: '2083-01-01',
    periodEnd: '2083-01-30',
    billingMonths: 1,
    company: '',
    companyShare: '',
    rate: '1000',
    rateDate: '2083-01-01',
    previousPeriod: '',
    remainingPeriod: '',
    resourceContent: {
      VehicleId: '101',
      VehicleNumber: 'BA 01 KHA 1234',
      VehicleType: 'Bus',
      Owners: [
        {
          Name: 'Hari Thapa',
          Type: 'Operator',
          Phone: '9800000000',
          Address: 'Lalitpur',
          SanghBranch: 'Lalitpur Branch',
        },
        {
          Name: 'Ram Bahadur',
          Type: 'Main Owner',
          Phone: '9841234567',
          Address: 'Kathmandu',
          SanghBranch: 'Kathmandu Branch',
        },
      ],
    },
    ...overrides,
  };
}

export function createTestVehicleResource(
  id = 'res-1',
  innerOverrides: Record<string, unknown> = {},
  externalContent: Record<string, unknown> = {},
): VehicleResourceDocument {
  return {
    id,
    resource: {
      id,
      resource_name: 'VehicleResource',
    },
    innerContent: {
      VehicleId: '101',
      VehicleNumber: 'BA 01 KHA 1234',
      VehicleType: 'Bus',
      VehicleTypeId: 'type-bus',
      Owners: [
        {
          Name: 'Hari Thapa',
          Type: 'Operator',
          Phone: '9800000000',
          Address: 'Lalitpur',
          SanghBranch: 'Lalitpur Branch',
        },
        {
          Name: 'Ram Bahadur',
          Type: 'Main Owner',
          Phone: '9841234567',
          Address: 'Kathmandu',
          SanghBranch: 'Kathmandu Branch',
        },
      ],
      ...innerOverrides,
    },
    externalContent,
  };
}

export function createTestReceipt(
  id = '1',
  overrides: Partial<ReceiptRecord> = {},
): ReceiptRecord {
  const fiscalYear = overrides.fiscalYear ?? '2083/84';
  const vehicleNumber = overrides.vehicleNumber ?? 'NA-6-KHA-1023';
  const customerName = overrides.customerName ?? 'Raju Thapa';

  return {
    id,
    billingType: 'MEMBERSHIP',
    customerPhone: '9855057608',
    customerPanNumber: '',
    receiptNumber: `MAIN.${id}`,
    fiscalYear,
    vehicleNumber,
    finalDigits: '1023',
    customerName,
    organizationName: 'नारायणी यातायात व्यवसायी संघ',
    billingDate: '2026-11-23',
    paymentDate: '2026-11-23',
    validUntil: '2026-12-22',
    paymentMethod: 'नगद',
    status: 'PAID',
    totalAmount: 2200,
    branchName: 'Main Branch',
    userName: 'Admin',
    printedCopyCount: 1,
    bill: {
      id,
      receiptNumber: `MAIN.${id}`,
      createdAt: '2026-11-23T06:00:00.000Z',
      content: {
        billingType: 'MEMBERSHIP',
        vehicle: {
          id: `v-${id}`,
          vehicleNumber,
          vehicleType: 'Truck',
          ownerName: customerName,
          phone: '9855057608',
          address: 'हेटौंडा',
          route: 'हेटौंडा - काठमाडौं',
        },
        branch: {
          id: '1',
          name: 'Main Branch',
          BranchCode: 'MAIN',
          address: 'हेटौंडा',
          phone: '',
          contactPerson: '',
        },
        fiscalYearId: fiscalYear,
        fiscalYearName: fiscalYear,
        billingDate: '2026-11-23',
        periodStart: '2026-11-23',
        periodEnd: '2026-12-22',
        billingMonths: 1,
        items: [
          {
            feeHeadId: '3',
            title: 'सदस्यता शुल्क',
            billingEntityId: '1',
            billingEntity: 'संघ',
            ruleId: '5',
            amount: 2200,
          },
        ],
        subtotal: 2200,
        discount: 0,
        total: 2200,
        paymentMethod: 'नगद',
        note: 'मासिक बापत',
      },
    },
    ...overrides,
  };
}
