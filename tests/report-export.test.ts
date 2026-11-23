import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  generateReportExcelBytes,
  generateReportPdfBytes,
  type ReportExportTemplate,
} from '@/shared/report-export';
import {
  buildAmdaniExportRows,
  createAmdaniReportTemplate,
} from '@/features/reports/templates/amdani-report.template';
import {
  createFeeHeadWiseReportTemplate,
  createMahasangReportTemplate,
  createMemberTransactionReportTemplate,
  createVehicleCategoryReportTemplate,
} from '@/features/reports/templates/report-templates';
import { createReceiptsExportTemplate } from '@/features/receipts/utils/receipt-export';
import { createMembersExportTemplate } from '@/features/members/utils/export-members';
import { createVehicleBlacklistExportTemplate } from '@/features/vehicle/blacklist/utils/vehicle-blacklist-export';
import type { ReceiptRecord } from '@/features/receipts/model/receipt';

const loadLocalAsset = async (assetPath: string) => {
  const relativePath = assetPath.replace(/^\/+/u, '');
  const buf = await readFile(path.join(process.cwd(), 'public', relativePath));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};

function makeReceipt(id: string, overrides: Partial<ReceiptRecord> = {}): ReceiptRecord {
  return {
    id,
    billingType: 'MEMBERSHIP',
    customerPhone: '9855057608',
    customerPanNumber: '',
    receiptNumber: `MAIN.${id}`,
    fiscalYear: '2083/84',
    vehicleNumber: 'BA PRA-06-001-KA-0033',
    finalDigits: '0033',
    customerName: 'Laxmi Sunrise Bank Limited',
    organizationName: 'नारायणी यातायात व्यवसायी संघ',
    billingDate: '2026-11-23',
    paymentDate: '2026-11-23',
    validUntil: '2027-07-15',
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
          vehicleNumber: 'BA PRA-06-001-KA-0033',
          vehicleType: 'Truck',
          ownerName: 'Laxmi Sunrise Bank Limited',
          operatorName: 'Sharada Readymix Concrete Pvt. Ltd',
          phone: '9855057608',
          address: 'हेटौंडा',
          route: 'हेटौंडा - काठमाडौं',
        },
        branch: {
          id: '1',
          name: 'Main Branch',
          BranchCode: 'MAIN',
          address: 'हेटौंडा -४, पारिजातपथ',
          phone: '',
          contactPerson: '',
        },
        fiscalYearId: '2083/84',
        fiscalYearName: '2083/84',
        billingDate: '2026-11-23',
        periodStart: '2026-11-23',
        periodEnd: '2027-07-15',
        billingMonths: 8,
        items: [
          {
            feeHeadId: '3',
            title: 'सदस्यता शुल्क',
            billingEntityId: '1',
            billingEntity: 'नारायणी यातायात व्यवसायी संघ',
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

describe('Centralized generic report PDF & Excel export engine', () => {
  it('generates multi-page Amdani PDF matching the 14-column grouped template', async () => {
    const receipts = Array.from({ length: 24 }, (_, idx) => makeReceipt(String(idx + 1), {
      totalAmount: (idx + 1) * 1000,
      billingType: idx % 5 === 0 ? 'GENERAL' : 'MEMBERSHIP',
    }));

    const rows = buildAmdaniExportRows(receipts);
    assert.equal(rows.length, 24);
    assert.equal(rows[0].otherAmount, 1000);
    assert.equal(rows[0].membershipAmount, 0);
    assert.equal(rows[1].membershipAmount, 2000);
    assert.equal(rows[1].otherAmount, 0);

    const template = createAmdaniReportTemplate({
      header: {
        organizationName: 'नारायणी यातायात व्यवसायी संघ',
        branchName: 'Main Branch',
        officeAddress: 'Main Branch, हेटौंडा -४, पारिजातपथ',
        reportTitle: 'दैनिक आम्दानी',
        reportDateRange: '२०८३/०८/०७ - २०८३/०८/०७',
        reportDateLine: '२०८३/०८/०७ देखि २०८३/०८/०७ सम्म',
      },
      filename: 'dainik-amdani-test',
      includeHeader: true,
    });

    const pdfBytes = await generateReportPdfBytes(template, rows, { loadAsset: loadLocalAsset });
    assert.ok(pdfBytes.length > 3000, 'Expected substantial multi-page PDF bytes');
    assert.equal(String.fromCharCode(...pdfBytes.slice(0, 5)), '%PDF-');

    const excelBytes = generateReportExcelBytes(template, rows);
    assert.ok(excelBytes.length > 2000, 'Expected valid OOXML xlsx bytes');
    // ZIP magic bytes PK\x03\x04
    assert.equal(excelBytes[0], 0x50);
    assert.equal(excelBytes[1], 0x4b);
    assert.equal(excelBytes[2], 0x03);
    assert.equal(excelBytes[3], 0x04);

    const excelText = new TextDecoder().decode(excelBytes);
    assert.ok(excelText.includes('आम्दानी शिर्षक'), 'Excel should include grouped header label');
    assert.ok(excelText.includes('कारोबार मिति'), 'Excel should include transaction date group header');
    assert.ok(excelText.includes('mergeCells'), 'Excel should include merged cells for header groups');
  });

  it('works generically with any custom report template', async () => {
    type SimpleRow = { code: string; name: string; amount: number };
    const template: ReportExportTemplate<SimpleRow> = {
      id: 'custom-test',
      filename: 'custom-test',
      orientation: 'portrait',
      header: {
        organizationName: 'Test Org',
        title: 'Custom Report',
      },
      columns: [
        { id: 'code', label: 'Code', width: 20, pdfValue: (r) => r.code },
        { id: 'name', label: 'Name', width: 50, pdfValue: (r) => r.name },
        { id: 'amount', label: 'Amount', width: 30, align: 'right', pdfValue: (r) => r.amount.toFixed(2), excelValue: (r) => r.amount },
      ],
      summaryFooter: (rows) => [
        { label: `Count: ${rows.length}` },
        { label: 'Total', value: String(rows.reduce((s, r) => s + r.amount, 0)) },
      ],
    };

    const rows: SimpleRow[] = [
      { code: 'A1', name: '=HYPERLINK("bad")', amount: 150 },
      { code: 'A2', name: 'Normal Row', amount: 250 },
    ];

    const pdfBytes = await generateReportPdfBytes(template, rows, { loadAsset: loadLocalAsset });
    assert.equal(String.fromCharCode(...pdfBytes.slice(0, 5)), '%PDF-');

    const excelBytes = generateReportExcelBytes(template, rows);
    const excelText = new TextDecoder().decode(excelBytes);
    assert.ok(excelText.includes('&apos;=HYPERLINK'), 'Formula injection should be neutralized in Excel strings');
  });

  it('safely renders Nepali Danda (।), Double Danda (॥), em-dash (—), and mixed scripts without WinAnsi crashes', async () => {
    const receiptWithSpecialChars = makeReceipt('99', {
      totalAmount: 13900,
      paymentMethod: 'QR',
    });
    receiptWithSpecialChars.bill.content.note = 'म.विमा २ जना सहित नया दर्ता । पौष ३० सम्मको मासिक शुल्क असुल ॥ मो बैंक ७।३० — “विशेष” ₹500';
    const rows = buildAmdaniExportRows([receiptWithSpecialChars]);
    const template = createAmdaniReportTemplate({
      header: {
        organizationName: 'नारायणी यातायात व्यवसायी संघ',
        branchName: 'Main Branch',
        officeAddress: 'Main Branch, हेटौंडा -४, पारिजातपथ',
        reportTitle: 'दैनिक आम्दानी',
        reportDateRange: '२०८३/०८/०७ - २०८३/०८/०७',
        reportDateLine: '२०८३/०८/०७ देखि २०८३/०८/०७ सम्म',
      },
      filename: 'special-chars-test',
    });

    const pdfBytes = await generateReportPdfBytes(template, rows, { loadAsset: loadLocalAsset });
    assert.equal(String.fromCharCode(...pdfBytes.slice(0, 5)), '%PDF-');
    assert.ok(pdfBytes.length > 2000);

    const excelBytes = generateReportExcelBytes(template, rows);
    const excelText = new TextDecoder().decode(excelBytes);
    assert.ok(excelText.includes('पौष ३० सम्मको मासिक शुल्क असुल'), 'Nepali remarks should be preserved verbatim in Excel');
    assert.ok(excelText.includes('BA PRA-06-001-KA-0033'), 'Vehicle number should be present in Excel');
    assert.ok(excelText.includes('13900'), 'Numeric amount should be present in Excel');
  });

  it('exports all centralized report & directory templates cleanly to both PDF and Excel', async () => {
    const receipt = makeReceipt('101');
    const sharedHeader = {
      organizationName: 'नारायणी यातायात व्यवसायी संघ',
      branchName: 'Main Branch',
      officeAddress: 'Main Branch, हेटौंडा -४, पारिजातपथ',
      reportTitle: 'परीक्षण रिपोर्ट',
      reportDateRange: '२०८३/०८/०७',
      reportDateLine: '२०८३/०८/०७',
    };

    // 1. FeeHeadWise template
    const fhTemplate = createFeeHeadWiseReportTemplate({
      header: sharedHeader,
      visibleFeeHeads: [{ id: '3', fiscalYearId: '2083/84', name: 'सदस्यता शुल्क', status: 'ACTIVE' }],
      allFeeHeads: [{ id: '3', fiscalYearId: '2083/84', name: 'सदस्यता शुल्क', status: 'ACTIVE' }],
    });
    const fhRows = [{ receipt, rowNumber: 1, amounts: { '3': 2200 }, operatorName: 'Sharada' }];
    assert.equal(String.fromCharCode(...(await generateReportPdfBytes(fhTemplate, fhRows, { loadAsset: loadLocalAsset })).slice(0, 5)), '%PDF-');
    assert.ok(new TextDecoder().decode(generateReportExcelBytes(fhTemplate, fhRows)).includes('सदस्यता शुल्क'));

    // 2. Mahasang template
    const mahasangTemplate = createMahasangReportTemplate({
      header: sharedHeader,
      visibleColumns: ['vehicleNumber', 'ownerName', 'receiptNumber', 'membershipIncome', 'total'],
      columnLabels: {
        vehicleNumber: 'गाडी नं.',
        previousVehicleNumber: 'पुरानो गाडी नं.',
        vehicleType: 'सवारी प्रकार',
        ownerName: 'धनीको नाम',
        ownerPhone: 'धनीको फोन',
        note: 'कैफियत',
        receiptNumber: 'रसिद नं.',
        membershipIncome: 'सदस्यताबाट',
        otherIncome: 'अन्य आम्दानी',
        total: 'जम्मा',
        periodMonths: 'अवधि महिना',
        paymentMethod: 'भुक्तानी तरिका',
        billingDate: 'का. मिति',
        periodStart: 'देखि',
        periodEnd: 'सम्म',
      },
    });
    const mahasangRows = [{
      id: '101',
      vehicleNumber: 'NA-6-KHA-1023',
      previousVehicleNumber: '—',
      vehicleType: 'Truck',
      ownerName: 'Raju Thapa',
      operatorName: '',
      ownerPhone: '9851043617',
      note: 'मासिक बापत ।',
      receiptNumber: '5.2829',
      membershipIncome: 2200,
      otherIncome: 0,
      total: 2200,
      periodMonths: 1,
      paymentMethod: 'नगद',
      billingDate: '2026-11-23',
      periodStart: '2026-11-23',
      periodEnd: '2026-12-22',
    }];
    assert.equal(String.fromCharCode(...(await generateReportPdfBytes(mahasangTemplate, mahasangRows, { loadAsset: loadLocalAsset })).slice(0, 5)), '%PDF-');
    assert.ok(new TextDecoder().decode(generateReportExcelBytes(mahasangTemplate, mahasangRows)).includes('NA-6-KHA-1023'));

    // 3. Vehicle Category template
    const vcTemplate = createVehicleCategoryReportTemplate({ header: sharedHeader });
    const vcRows = [{ ...mahasangRows[0], route: 'हेटौंडा - काठमाडौं', routePermitExpiry: '2084-01-01' }];
    assert.equal(String.fromCharCode(...(await generateReportPdfBytes(vcTemplate, vcRows, { loadAsset: loadLocalAsset })).slice(0, 5)), '%PDF-');
    assert.ok(new TextDecoder().decode(generateReportExcelBytes(vcTemplate, vcRows)).includes('हेटौंडा - काठमाडौं'));

    // 4. Member Transaction template
    const mtTemplate = createMemberTransactionReportTemplate({
      header: sharedHeader,
      filename: 'member-tx',
      profile: [['सवारी नं.', 'NA-6-KHA-1023'], ['धनीको नाम', 'Raju Thapa']],
    });
    const mtRows = [{ paymentDate: '2026-11-23', validUntil: '2026-12-22', receiptNumber: '5.2829', remarks: 'मासिक बापत', totalAmount: 2200, extraAmount: 0 }];
    assert.equal(String.fromCharCode(...(await generateReportPdfBytes(mtTemplate, mtRows, { loadAsset: loadLocalAsset })).slice(0, 5)), '%PDF-');
    assert.ok(new TextDecoder().decode(generateReportExcelBytes(mtTemplate, mtRows)).includes('5.2829'));

    // 5. Receipts, Members, Vehicle Blacklist templates
    const receiptsTemplate = createReceiptsExportTemplate(['receiptNumber', 'vehicleNumber', 'customer', 'totalAmount'], '2083/84');
    assert.ok(new TextDecoder().decode(generateReportExcelBytes(receiptsTemplate, [receipt])).includes('BA PRA-06-001-KA-0033'));

    const membersTemplate = createMembersExportTemplate();
    assert.ok(membersTemplate.columns.length === 12);

    const blacklistTemplate = createVehicleBlacklistExportTemplate();
    assert.ok(blacklistTemplate.columns.length === 8);
  });
});
