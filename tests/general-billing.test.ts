import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildBillResourceContent } from '@/features/billing/api/bill-resource.api';
import { NAV_ITEMS, REPORT_NAV_ITEMS, canAccessDashboardPath } from '@/components/common/layout/navigation/sidebar-config';
import type { GeneralBillInput } from '@/features/billing/model/bill.types';

describe('3. General Billing & Feature Flags', () => {
  describe('Navigation & Sidebar constraints', () => {
    test('does not expose a standalone General Billing sidebar link', () => {
      const allNavLinks = [...NAV_ITEMS, ...REPORT_NAV_ITEMS];
      const generalBillingItem = allNavLinks.find(
        (item) => item.href.includes('general-billing') || item.key.toLowerCase().includes('generalbilling'),
      );
      assert.equal(generalBillingItem, undefined);
    });

    test('exposes /dashboard/billing-new for standard billing access', () => {
      const billingItem = NAV_ITEMS.find((item) => item.href === '/dashboard/billing-new');
      assert.ok(billingItem);
      assert.equal(billingItem?.adminOnly, undefined);
      assert.equal(canAccessDashboardPath('/dashboard/billing-new', false), true);
    });
  });

  describe('Entity & Branch Compatibility for General Billing', () => {
    type Branch = { id: string; name: string; code: string; status: string; billingEntityIds: string[] };
    type Entity = { id: string; entity: string; status: string };

    function resolveGeneralBillingEntity(
      selectedBranchId: string,
      selectedEntityId: string,
      branches: Branch[],
      entities: Entity[],
    ): { availableEntities: Entity[]; resolvedEntityId: string } {
      const activeBranches = branches.filter((b) => b.status === 'ACTIVE');
      const activeEntities = entities.filter((e) => e.status === 'ACTIVE');
      const selectedBranch = activeBranches.find((b) => b.id === selectedBranchId);

      const availableEntities = selectedBranch?.billingEntityIds.length
        ? activeEntities.filter((e) => selectedBranch.billingEntityIds.includes(e.id))
        : activeEntities;

      const resolvedEntityId = availableEntities.some((e) => e.id === selectedEntityId)
        ? selectedEntityId
        : availableEntities.length === 1
          ? availableEntities[0].id
          : '';

      return { availableEntities, resolvedEntityId };
    }

    test('filters entities by branch compatibility when branch has configured billingEntityIds', () => {
      const branches: Branch[] = [
        { id: 'B1', name: 'Branch 1', code: 'B1', status: 'ACTIVE', billingEntityIds: ['E1'] },
      ];
      const entities: Entity[] = [
        { id: 'E1', entity: 'Main Entity', status: 'ACTIVE' },
        { id: 'E2', entity: 'Other Entity', status: 'ACTIVE' },
      ];

      const { availableEntities, resolvedEntityId } = resolveGeneralBillingEntity('B1', '', branches, entities);
      assert.equal(availableEntities.length, 1);
      assert.equal(availableEntities[0].id, 'E1');
      assert.equal(resolvedEntityId, 'E1');
    });

    test('excludes inactive entities even if listed in branch billingEntityIds', () => {
      const branches: Branch[] = [
        { id: 'B1', name: 'Branch 1', code: 'B1', status: 'ACTIVE', billingEntityIds: ['E1', 'E2'] },
      ];
      const entities: Entity[] = [
        { id: 'E1', entity: 'Active Entity', status: 'ACTIVE' },
        { id: 'E2', entity: 'Inactive Entity', status: 'INACTIVE' },
      ];

      const { availableEntities, resolvedEntityId } = resolveGeneralBillingEntity('B1', 'E2', branches, entities);
      assert.equal(availableEntities.length, 1);
      assert.equal(availableEntities[0].id, 'E1');
      assert.equal(resolvedEntityId, 'E1');
    });

    test('returns empty entity selection if no active entities are compatible', () => {
      const branches: Branch[] = [
        { id: 'B1', name: 'Branch 1', code: 'B1', status: 'ACTIVE', billingEntityIds: ['E99'] },
      ];
      const entities: Entity[] = [
        { id: 'E1', entity: 'Active Entity', status: 'ACTIVE' },
      ];

      const { availableEntities, resolvedEntityId } = resolveGeneralBillingEntity('B1', '', branches, entities);
      assert.equal(availableEntities.length, 0);
      assert.equal(resolvedEntityId, '');
    });
  });

  describe('General Bill Validation & Resource Construction', () => {
    function validateGeneralBill(input: {
      customerName: string;
      branch: { id: string; code: string; status: string } | null;
      entityId: string;
      fiscalYearId: string;
      charges: Array<{ description: string; amount: string }>;
    }): string | null {
      if (!input.customerName.trim()) return 'ग्राहकको नाम आवश्यक छ।';
      if (!input.branch) return 'बिलिङ शाखा छान्नुहोस्।';
      if (!input.branch.code.trim()) return 'चयन गरिएको शाखाको कोड उपलब्ध छैन।';
      if (!input.entityId) return 'बिलिङ इकाइ छान्नुहोस्।';
      if (!input.fiscalYearId) return 'सक्रिय आर्थिक वर्ष उपलब्ध छैन।';
      if (input.charges.length === 0) return 'हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।';
      const parsed = input.charges.map((c) => ({
        description: c.description.trim(),
        amount: Number(c.amount),
        rawAmount: c.amount,
      }));
      if (parsed.some((c) => !c.description || !c.rawAmount.trim() || !Number.isFinite(c.amount) || c.amount < 0)) {
        return 'हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।';
      }
      return null;
    }

    test('validates customer name requirement', () => {
      const err = validateGeneralBill({
        customerName: '   ',
        branch: { id: 'B1', code: 'B1', status: 'ACTIVE' },
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: 'Hall Rental', amount: '5000' }],
      });
      assert.equal(err, 'ग्राहकको नाम आवश्यक छ।');
    });

    test('validates active branch and branch code', () => {
      const missingBranch = validateGeneralBill({
        customerName: 'Sita',
        branch: null,
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: 'Hall Rental', amount: '5000' }],
      });
      assert.equal(missingBranch, 'बिलिङ शाखा छान्नुहोस्।');

      const blankCode = validateGeneralBill({
        customerName: 'Sita',
        branch: { id: 'B1', code: '  ', status: 'ACTIVE' },
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: 'Hall Rental', amount: '5000' }],
      });
      assert.equal(blankCode, 'चयन गरिएको शाखाको कोड उपलब्ध छैन।');
    });

    test('validates charge rows: requires non-empty description and valid positive amount', () => {
      const emptyDesc = validateGeneralBill({
        customerName: 'Sita',
        branch: { id: 'B1', code: 'B1', status: 'ACTIVE' },
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: '  ', amount: '5000' }],
      });
      assert.equal(emptyDesc, 'हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।');

      const negativeAmount = validateGeneralBill({
        customerName: 'Sita',
        branch: { id: 'B1', code: 'B1', status: 'ACTIVE' },
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: 'Hall Rental', amount: '-500' }],
      });
      assert.equal(negativeAmount, 'हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।');

      const nonNumericAmount = validateGeneralBill({
        customerName: 'Sita',
        branch: { id: 'B1', code: 'B1', status: 'ACTIVE' },
        entityId: 'E1',
        fiscalYearId: 'FY1',
        charges: [{ description: 'Hall Rental', amount: 'abc' }],
      });
      assert.equal(nonNumericAmount, 'हरेक शुल्क विवरण लेख्नुहोस् र मान्य रकम प्रविष्ट गर्नुहोस्।');
    });

    test('builds general bill BillResourcePayload with customer object and no vehicle object', () => {
      const generalInput: GeneralBillInput = {
        billingType: 'GENERAL',
        customer: {
          name: 'Narayani Logistics Pvt Ltd',
          phone: '9855012345',
          address: 'Bharatpur-10, Chitwan',
          panNumber: '302918273',
        },
        details: {
          branchId: 'BR-1',
          branchName: 'Head Office',
          branchCode: 'HO',
          branchAddress: 'Kathmandu',
          branchPhone: '01-440000',
          branchContactPerson: 'Manager',
          allowManualReceiptAmountOverride: false,
          fiscalYearId: 'FY-8182',
          fiscalYearName: '2081/82',
          billingDate: '2081-06-01',
          periodStart: '',
          periodEnd: '',
          billingMonths: 0,
        },
        items: [
          {
            id: 'gen-1',
            title: 'Meeting Hall Rent',
            amount: 7500,
            entity: 'Sangh Chitwan',
            entityId: 'ENT-1',
            feeHeadId: '',
            isManual: true,
          },
        ],
        subtotal: 7500,
        discount: 0,
        paymentMethod: 'बैंक ट्रान्सफर',
        note: 'Annual general meeting booking',
      };

      const payload = buildBillResourceContent(generalInput);
      assert.equal(payload.billingType, 'GENERAL');
      assert.equal('vehicle' in payload, false);
      assert.ok(payload.customer);
      assert.equal(payload.customer.name, 'Narayani Logistics Pvt Ltd');
      assert.equal(payload.customer.panNumber, '302918273');
      assert.equal(payload.customer.phone, '9855012345');
      assert.equal(payload.subtotal, 7500);
      assert.equal(payload.total, 7500);
      assert.equal(payload.paymentMethod, 'बैंक ट्रान्सफर');
    });
  });
});
