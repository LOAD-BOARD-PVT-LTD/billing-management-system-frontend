import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapBillingRuleResource,
  unwrapBillingRuleResource,
  listBillingRuleResources,
} from '@/features/billing-rules/api/billingRuleResource';
import { billingRulesApi } from '@/features/billing-rules/api/billingRulesApi';
import { apiClient } from '@/lib/api/client';
import type { BillingRuleConfig } from '@/features/billing-rules/model/types';
import { assertUniqueFeeHeadNames, findDuplicateFeeHead } from '@/features/billing-rules/utils/fee-head-name-validation';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import { billingRuleSchema, validateBillingRuleRecord } from '@/features/billing-rules/schemas/billingRuleSchema';
import { getPeriodForFrequency, getPeriodLabel, validityOptionsByFrequency } from '@/features/billing-rules/utils/rule-period-policy';
import { readWorkspaceFile } from '@/tests/helpers/source-assertions';

describe('1. Billing Rule Configuration', () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalDelete = apiClient.delete;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.delete = originalDelete;
  });

  describe('Fee head name uniqueness', () => {
    test('rejects duplicate names even when fee-head IDs differ', () => {
      assert.throws(
        () => assertUniqueFeeHeadNames([
          { id: 'fee-1', code: 'FEE-1', fiscalYearId: 'fy-1', name: 'Road Tax', status: 'ACTIVE' },
          { id: 'fee-2', code: 'FEE-2', fiscalYearId: 'fy-1', name: 'Road Tax', status: 'ACTIVE' },
        ]),
        /पहिले नै छ/u,
      );
    });

    describe('Fee head display order', () => {
      test('sorts by saved display order and preserves legacy order for unnumbered heads', () => {
        const feeHeads = [
          { id: 'fee-1', fiscalYearId: 'fy-1', name: 'First', status: 'ACTIVE' as const },
          { id: 'fee-2', fiscalYearId: 'fy-1', name: 'Second', status: 'ACTIVE' as const, displayOrder: 2 },
          { id: 'fee-3', fiscalYearId: 'fy-1', name: 'Third', status: 'ACTIVE' as const, displayOrder: 0 },
        ];

        assert.deepEqual(
          sortFeeHeadsByDisplayOrder(feeHeads).map((feeHead) => feeHead.id),
          ['fee-3', 'fee-2', 'fee-1'],
        );
      });
    });

    describe('Billing rule frequency policy', () => {
      test('provides only validity choices matching the rule frequency and derives its period', () => {
        assert.deepEqual(
          validityOptionsByFrequency.ONE_TIME.map((option) => option.value),
          ['SAME_DAY', 'END_OF_FISCAL_YEAR'],
        );
        assert.deepEqual(
          validityOptionsByFrequency.PERIODIC.map((option) => option.value),
          ['SAME_DAY', 'END_OF_MONTH', 'END_OF_FISCAL_YEAR'],
        );
        assert.equal(getPeriodForFrequency('ONE_TIME', 'SAME_DAY'), null);
        assert.equal(getPeriodForFrequency('ONE_TIME', 'END_OF_FISCAL_YEAR'), 'FISCAL_YEAR');
        assert.equal(getPeriodForFrequency('PERIODIC', 'SAME_DAY'), 'MONTH');
        assert.equal(getPeriodForFrequency('PERIODIC', 'END_OF_MONTH'), 'MONTH');
        assert.equal(getPeriodForFrequency('PERIODIC', 'END_OF_FISCAL_YEAR'), 'FISCAL_YEAR');
        assert.equal(getPeriodLabel(null), 'लागू हुँदैन');
      });

      test('rejects validity and period combinations that do not match frequency', () => {
        const baseRule = {
          id: 'rule-1',
          feeHeadId: 'fee-1',
          fiscalYearId: 'year-1',
          billingEntityId: 'entity-1',
          scope: 'COMMON' as const,
          vehicleCategoryId: null,
          frequency: 'PERIODIC' as const,
          period: 'MONTH' as const,
          validity: 'END_OF_MONTH' as const,
          amount: 100,
          status: 'ACTIVE' as const,
        };

        assert.equal(billingRuleSchema.safeParse(baseRule).success, true);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: 'vehicle-1',
          amount: 0,
        }).success, true);
        assert.equal(validateBillingRuleRecord({
          ...baseRule,
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: 'vehicle-1',
          amount: 0,
        }).isValid, true);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          period: 'FISCAL_YEAR',
        }).success, false);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          validity: 'END_OF_FISCAL_YEAR',
        }).success, false);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          period: 'FISCAL_YEAR',
          validity: 'END_OF_FISCAL_YEAR',
        }).success, true);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          frequency: 'ONE_TIME',
          period: null,
          validity: 'SAME_DAY',
        }).success, true);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          frequency: 'ONE_TIME',
          period: 'FISCAL_YEAR',
          validity: 'END_OF_FISCAL_YEAR',
        }).success, true);
        assert.equal(billingRuleSchema.safeParse({
          ...baseRule,
          frequency: 'ONE_TIME',
          period: null,
          validity: 'END_OF_FISCAL_YEAR',
        }).success, false);
      });
    });

    test('rejects names with case or repeated-whitespace differences in the same fiscal year', () => {
      assert.throws(
        () => assertUniqueFeeHeadNames([
          { id: 'fee-1', fiscalYearId: 'fy-1', name: 'Road   Tax', status: 'INACTIVE' },
          { id: 'fee-2', fiscalYearId: 'fy-1', name: ' road tax ', status: 'ACTIVE' },
        ]),
        /पहिले नै छ/u,
      );
    });

    test('allows the same fee-head name in different fiscal years', () => {
      assert.doesNotThrow(() => assertUniqueFeeHeadNames([
        { id: 'fee-1', fiscalYearId: 'fy-1', name: 'Road Tax', status: 'ACTIVE' },
        { id: 'fee-2', fiscalYearId: 'fy-2', name: ' road   tax ', status: 'ACTIVE' },
      ]));
    });

    test('allows updating an existing fee head without treating itself as a duplicate', () => {
      assert.doesNotThrow(() => assertUniqueFeeHeadNames([
        { id: 'fee-1', fiscalYearId: 'fy-1', name: 'Updated name', status: 'ACTIVE' },
        { id: 'fee-2', fiscalYearId: 'fy-1', name: 'Another fee', status: 'ACTIVE' },
      ]));
    });

    test('allows creating a fee head in a new fiscal year even if legacy duplicates exist in an older fiscal year', () => {
      const previousFeeHeads = [
        { id: 'legacy-1', fiscalYearId: '2082/83', name: 'बिलम्ब बापत', status: 'ACTIVE' as const },
        { id: 'legacy-2', fiscalYearId: '2082/83', name: 'बिलम्ब बापत', status: 'INACTIVE' as const },
      ];
      assert.doesNotThrow(() => assertUniqueFeeHeadNames(
        [
          ...previousFeeHeads,
          { id: 'new-1', fiscalYearId: '2083/84', name: 'बिलम्ब बापत', status: 'ACTIVE' },
        ],
        previousFeeHeads,
      ));
      assert.throws(
        () => assertUniqueFeeHeadNames(
          [
            ...previousFeeHeads,
            { id: 'new-1', fiscalYearId: '2083/84', name: 'बिलम्ब बापत', status: 'ACTIVE' },
            { id: 'new-2', fiscalYearId: '2083/84', name: 'बिलम्ब बापत', status: 'ACTIVE' },
          ],
          previousFeeHeads,
        ),
        /पहिले नै छ/u,
      );
    });

    test('rejects duplicate names before issuing API writes', async () => {
      let writeCount = 0;
      apiClient.post = async <T>(): Promise<T> => { writeCount += 1; return undefined as T; };
      apiClient.put = async <T>(): Promise<T> => { writeCount += 1; return undefined as T; };
      const emptyConfig: BillingRuleConfig = {
        version: 1,
        feeHeads: [],
        fiscalYears: [],
        rules: [],
      };
      const config: BillingRuleConfig = {
        ...emptyConfig,
        feeHeads: [
          { id: 'fee-1', fiscalYearId: 'fy-1', name: 'Road Tax', status: 'ACTIVE' },
          { id: 'fee-2', fiscalYearId: 'fy-1', name: 'road tax', status: 'ACTIVE' },
        ],
      };

      await assert.rejects(
        billingRulesApi.save(config, emptyConfig),
        /पहिले नै छ/u,
      );
      assert.equal(writeCount, 0);
    });

    test('rejects a fee head used by both Common and Vehicle Type rules before API writes', async () => {
      let writeCount = 0;
      apiClient.post = async <T>(): Promise<T> => { writeCount += 1; return undefined as T; };
      apiClient.put = async <T>(): Promise<T> => { writeCount += 1; return undefined as T; };
      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [
          { id: 'fee-1', fiscalYearId: 'year-1', name: 'Road Tax', status: 'ACTIVE' },
        ],
        fiscalYears: [],
        rules: [
          {
            id: 'common-rule',
            feeHeadId: 'fee-1',
            fiscalYearId: 'year-1',
            billingEntityId: 'entity-1',
            scope: 'COMMON',
            vehicleCategoryId: null,
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 100,
            status: 'ACTIVE',
          },
          {
            id: 'vehicle-rule',
            feeHeadId: 'fee-1',
            fiscalYearId: 'year-1',
            billingEntityId: 'entity-2',
            scope: 'VEHICLE_TYPE',
            vehicleCategoryId: 'vehicle-1',
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 100,
            status: 'ACTIVE',
          },
        ],
      };

      await assert.rejects(
        billingRulesApi.save(config, { version: 1, feeHeads: [], fiscalYears: [], rules: [] }),
        /Road Tax.*Common र Vehicle Type/u,
      );
      assert.equal(writeCount, 0);
    });

    test('rejects duplicate fee head names across canonicalized Nepali/English fiscal years and invisible characters', () => {
      assert.throws(
        () => assertUniqueFeeHeadNames([
          { id: 'fee-1', fiscalYearId: '2083/84', name: 'धरौटी सापट', status: 'ACTIVE' },
          { id: 'fee-2', fiscalYearId: '२०८३/८४', name: 'धरौटी\u200B  सापट ', status: 'ACTIVE' },
        ]),
        /पहिले नै छ/u,
      );

      assert.throws(
        () => assertUniqueFeeHeadNames([
          { id: 'fee-1', fiscalYearId: '2083-84', name: 'नवीकरण शुल्क', status: 'ACTIVE' },
          { id: 'fee-2', fiscalYearId: '2083/2084', name: 'नवीकरण शुल्क', status: 'ACTIVE' },
        ]),
        /पहिले नै छ/u,
      );
    });

    test('findDuplicateFeeHead detects same-fiscal-year duplicates while ignoring self and other fiscal years', () => {
      const existing = [
        { id: 'fh-1', fiscalYearId: '2083/84', name: 'धरौटी सापट', status: 'ACTIVE' as const },
        { id: 'fh-2', fiscalYearId: '2082/83', name: 'सदस्यता शुल्क', status: 'ACTIVE' as const },
      ];

      assert.equal(
        findDuplicateFeeHead(existing, { id: 'new-1', fiscalYearId: '२०८३/८४', name: ' धरौटी   सापट ' })?.id,
        'fh-1',
      );
      assert.equal(
        findDuplicateFeeHead(existing, { id: 'fh-1', fiscalYearId: '2083/84', name: 'धरौटी सापट' }),
        undefined,
      );
      assert.equal(
        findDuplicateFeeHead(existing, { id: 'new-2', fiscalYearId: '2083/84', name: 'सदस्यता शुल्क' }),
        undefined,
      );
    });

    test('rejects reactivating an INACTIVE legacy duplicate while still allowing deactivation of a duplicate', () => {
      const previousFeeHeads = [
        { id: 'legacy-1', fiscalYearId: '2083/84', name: 'धरौटी सापट', status: 'ACTIVE' as const },
        { id: 'legacy-2', fiscalYearId: '2083/84', name: 'धरौटी सापट', status: 'INACTIVE' as const },
        { id: 'legacy-3', fiscalYearId: '2083/84', name: 'धरौटी सापट', status: 'ACTIVE' as const },
      ];

      assert.doesNotThrow(() => assertUniqueFeeHeadNames(
        [
          previousFeeHeads[0],
          previousFeeHeads[1],
          { ...previousFeeHeads[2], status: 'INACTIVE' },
        ],
        previousFeeHeads,
      ));

      assert.throws(
        () => assertUniqueFeeHeadNames(
          [
            previousFeeHeads[0],
            { ...previousFeeHeads[1], status: 'ACTIVE' },
            previousFeeHeads[2],
          ],
          previousFeeHeads,
        ),
        /पहिले नै छ/u,
      );
    });

    test('wires live duplicate fee-head validation in FeeHeadDialog and FeeHeadManager', () => {
      const dialogSource = readWorkspaceFile('features', 'billing-rules', 'components', 'configuration', 'FeeHeadDialog.tsx');
      const managerSource = readWorkspaceFile('features', 'billing-rules', 'components', 'configuration', 'FeeHeadManager.tsx');

      assert.ok(dialogSource.includes('findDuplicateFeeHead'));
      assert.ok(dialogSource.includes('Boolean(duplicateFeeHead)'));
      assert.ok(managerSource.includes('existingFeeHeads={feeHeads}'));
    });
  });

  describe('404 Handling vs Network and Server Errors', () => {
    test('handles empty database: specific 404 for BillingRuleResource returns empty array', async () => {
      apiClient.get = async () => {
        throw new Error('Request failed (404): No resources found for resource name: BillingRuleResource');
      };
      const result = await listBillingRuleResources();
      assert.deepEqual(result, []);
    });

    test('rethrows unrelated 404 errors', async () => {
      apiClient.get = async () => {
        throw new Error('Request failed (404): Endpoint /foo not found');
      };
      await assert.rejects(
        async () => listBillingRuleResources(),
        /Request failed \(404\): Endpoint \/foo not found/,
      );
    });

    test('rethrows 500 server errors', async () => {
      apiClient.get = async () => {
        throw new Error('Request failed (500): Internal server error');
      };
      await assert.rejects(
        async () => listBillingRuleResources(),
        /Request failed \(500\)/,
      );
    });

    test('rethrows network/connection errors', async () => {
      apiClient.get = async () => {
        throw new Error('NetworkError when attempting to fetch resource.');
      };
      await assert.rejects(
        async () => listBillingRuleResources(),
        /NetworkError/,
      );
    });
  });

  describe('Resource parsing and normalization', () => {
    test('parses wrapped BillingRuleResource with valid rule, fee head, and fiscal year', () => {
      const rawPayload = {
        id: 101,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'COMMON',
          frequency: 'ONE_TIME',
          period: null,
          validity: 'END_OF_MONTH',
          amount: 500,
          status: 'ACTIVE',
          effectiveDate: '2081-01-01',
          meetingReference: 'Decision #42',
          feeHead: { id: 1, name: 'Registration Fee', status: 'ACTIVE' },
          fiscalYear: { id: 2, name: '2081/82', status: 'ACTIVE', isDefault: true },
        },
      };

      const doc = mapBillingRuleResource(rawPayload);
      assert.equal(doc.resourceId, '101');
      assert.equal(doc.config.rules.length, 1);
      assert.equal(doc.config.rules[0].scope, 'COMMON');
      assert.equal(doc.config.rules[0].period, null);
      assert.equal(doc.config.rules[0].validity, 'SAME_DAY');
      assert.equal(doc.config.rules[0].amount, 500);
      assert.equal(doc.config.rules[0].effectiveDate, '2081-01-01');
      assert.equal(doc.config.rules[0].meetingReference, 'Decision #42');
      assert.equal(doc.config.feeHeads[0].name, 'Registration Fee');
      assert.equal(doc.config.fiscalYears[0].name, '2081/82');
    });

    test('distinguishes COMMON vs VEHICLE_TYPE scope with vehicleCategoryId', () => {
      const vehicleTypePayload = {
        id: 202,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: 5,
          frequency: 'PERIODIC',
          period: 'MONTH',
          validity: 'END_OF_MONTH',
          amount: 1200,
          status: 'ACTIVE',
          feeHead: { id: 10, name: 'Monthly Route Fee' },
          fiscalYear: { id: 2, name: '2081/82' },
        },
      };

      const doc = mapBillingRuleResource(vehicleTypePayload);
      assert.equal(doc.config.rules[0].scope, 'VEHICLE_TYPE');
      assert.equal(doc.config.rules[0].vehicleCategoryId, '5');
      assert.equal(doc.config.rules[0].period, 'MONTH');
      assert.equal(doc.config.rules[0].validity, 'END_OF_MONTH');
    });

    test('preserves a zero amount for Vehicle Type rules', () => {
      const doc = mapBillingRuleResource({
        id: 208,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: 5,
          frequency: 'PERIODIC',
          period: 'MONTH',
          validity: 'END_OF_MONTH',
          amount: 0,
          status: 'ACTIVE',
          feeHead: { id: 10, name: 'Monthly Route Fee' },
          fiscalYear: { id: 2, name: '2081/82' },
        },
      });

      assert.equal(doc.config.rules.length, 1);
      assert.equal(doc.config.rules[0].amount, 0);
    });

    test('preserves yearly periodic rule period and validity', () => {
      const doc = mapBillingRuleResource({
        id: 207,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: 5,
          frequency: 'PERIODIC',
          period: 'FISCAL_YEAR',
          validity: 'END_OF_FISCAL_YEAR',
          amount: 1200,
          status: 'ACTIVE',
          feeHead: { id: 10, name: 'Monthly Route Fee' },
          fiscalYear: { id: 2, name: '2081/82' },
        },
      });

      assert.equal(doc.config.rules[0].period, 'FISCAL_YEAR');
      assert.equal(doc.config.rules[0].validity, 'END_OF_FISCAL_YEAR');
    });

    test('rejects VEHICLE_TYPE rule if vehicleCategoryId is missing', () => {
      const invalidPayload = {
        id: 203,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'VEHICLE_TYPE',
          vehicleCategoryId: null,
          frequency: 'PERIODIC',
          period: 'MONTH',
          validity: 'END_OF_MONTH',
          amount: 1000,
          status: 'ACTIVE',
          feeHead: { id: 10, name: 'Fee' },
          fiscalYear: { id: 2, name: '2081/82' },
        },
      };

      const doc = mapBillingRuleResource(invalidPayload);
      assert.equal(doc.config.rules.length, 0);
    });

    test('rejects invalid amounts (NaN, Infinity, non-numeric)', () => {
      const invalidAmountPayload = {
        id: 204,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'BILLING_RULE',
          scope: 'COMMON',
          frequency: 'ONE_TIME',
          period: null,
          validity: 'SAME_DAY',
          amount: 'not-a-number',
          status: 'ACTIVE',
          feeHead: { id: 10, name: 'Fee' },
          fiscalYear: { id: 2, name: '2081/82' },
        },
      };

      const doc = mapBillingRuleResource(invalidAmountPayload);
      assert.equal(doc.config.rules.length, 0);
    });

    test('rejects unsupported scopes, frequencies, periods, or validities', () => {
      const invalidScope = {
        id: 205,
        resource_name: 'BillingRuleResource',
        inner_content: {
          scope: 'UNKNOWN_SCOPE',
          frequency: 'ONE_TIME',
          period: null,
          validity: 'SAME_DAY',
          amount: 100,
          status: 'ACTIVE',
          feeHead: { id: 1, name: 'Fee' },
          fiscalYear: { id: 1, name: 'Year' },
        },
      };
      assert.equal(mapBillingRuleResource(invalidScope).config.rules.length, 0);

      const invalidFrequency = {
        id: 206,
        resource_name: 'BillingRuleResource',
        inner_content: {
          scope: 'COMMON',
          frequency: 'HOURLY',
          period: null,
          validity: 'SAME_DAY',
          amount: 100,
          status: 'ACTIVE',
          feeHead: { id: 1, name: 'Fee' },
          fiscalYear: { id: 1, name: 'Year' },
        },
      };
      assert.equal(mapBillingRuleResource(invalidFrequency).config.rules.length, 0);
    });

    test('handles standalone FEE_HEAD and FISCAL_YEAR inner_content records', () => {
      const feeHeadDoc = mapBillingRuleResource({
        id: 301,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'FEE_HEAD',
          name: 'Annual Sangh Membership',
          code: 'ASM-01',
          fiscalYearId: 5,
          displayOrder: 4,
          status: 'ACTIVE',
        },
      });
      assert.equal(feeHeadDoc.config.feeHeads.length, 1);
      assert.equal(feeHeadDoc.config.feeHeads[0].id, '301');
      assert.equal(feeHeadDoc.config.feeHeads[0].name, 'Annual Sangh Membership');
      assert.equal(feeHeadDoc.config.feeHeads[0].displayOrder, 4);

      const fiscalYearDoc = mapBillingRuleResource({
        id: 302,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'FISCAL_YEAR',
          name: '2082/83',
          code: '8283',
          startDate: '2082-04-01',
          endDate: '2083-03-31',
          status: 'ACTIVE',
          isDefault: false,
        },
      });
      assert.equal(fiscalYearDoc.config.fiscalYears.length, 1);
      assert.equal(fiscalYearDoc.config.fiscalYears[0].id, '302');
      assert.equal(fiscalYearDoc.config.fiscalYears[0].name, '2082/83');
    });

    test('throws if resource response is missing an ID', () => {
      const missingIdPayload = {
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'FEE_HEAD',
          name: 'No ID Fee',
        },
      };
      assert.throws(
        () => mapBillingRuleResource(missingIdPayload),
        /The BillingRuleResource response is missing its ID/,
      );
    });
  });

  describe('Merging and uniqueById deduplication', () => {
    test('merges multiple documents and deduplicates fee heads and fiscal years by ID', () => {
      const docs = [
        {
          id: 1,
          inner_content: {
            rules: [
              {
                id: 'R1',
                scope: 'COMMON',
                frequency: 'ONE_TIME',
                period: null,
                validity: 'SAME_DAY',
                amount: 100,
                status: 'ACTIVE',
                feeHead: { id: 'F1', name: 'Fee 1' },
                fiscalYear: { id: 'Y1', name: '2081/82' },
              },
            ],
            feeHeads: [{ id: 'F1', name: 'Fee 1', status: 'ACTIVE' }],
            fiscalYears: [{ id: 'Y1', name: '2081/82', status: 'ACTIVE' }],
          },
        },
        {
          id: 2,
          inner_content: {
            rules: [
              {
                id: 'R2',
                scope: 'COMMON',
                frequency: 'ONE_TIME',
                period: null,
                validity: 'SAME_DAY',
                amount: 200,
                status: 'ACTIVE',
                feeHead: { id: 'F1', name: 'Fee 1' },
                fiscalYear: { id: 'Y1', name: '2081/82' },
              },
            ],
          },
        },
      ];

      const unwrapped = unwrapBillingRuleResource(docs);
      assert.equal(unwrapped.rules.length, 2);
      assert.equal(unwrapped.feeHeads.length, 1);
      assert.equal(unwrapped.fiscalYears.length, 1);
      assert.equal(unwrapped.rules[0].id, 'R1');
      assert.equal(unwrapped.rules[1].id, 'R2');
    });
  });

  describe('CRUD Operations and Business Validations in billingRulesApi.save', () => {
    test('persists fee-head display-order changes', async () => {
      const writes: Array<{ id: string; displayOrder: number }> = [];
      apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
        const request = body as {
          id: string | number;
          inner_content: { resourceType: string; displayOrder: number };
        };
        writes.push({
          id: String(request.id),
          displayOrder: request.inner_content.displayOrder,
        });
        return {
          id: request.id,
          resource_name: 'BillingRuleResource',
          inner_content: request.inner_content,
        } as T;
      };
      const feeHeads = [
        { id: 'fee-1', name: 'First', code: 'F1', fiscalYearId: 'year-1', status: 'ACTIVE' as const, displayOrder: 0 },
        { id: 'fee-2', name: 'Second', code: 'F2', fiscalYearId: 'year-1', status: 'ACTIVE' as const, displayOrder: 1 },
      ];
      const previousConfig: BillingRuleConfig = {
        version: 1,
        feeHeads,
        fiscalYears: [],
        rules: [],
      };
      const nextConfig: BillingRuleConfig = {
        ...previousConfig,
        feeHeads: [
          { ...feeHeads[1], displayOrder: 0 },
          { ...feeHeads[0], displayOrder: 1 },
        ],
      };

      const saved = await billingRulesApi.save(nextConfig, previousConfig);

      assert.deepEqual(writes, [
        { id: 'fee-2', displayOrder: 0 },
        { id: 'fee-1', displayOrder: 1 },
      ]);
      assert.deepEqual(
        saved.config.feeHeads.map((feeHead) => feeHead.displayOrder),
        [0, 1],
      );
    });

    test('throws if more than one default fiscal year is specified', async () => {
      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [],
        fiscalYears: [
          { id: '1', name: '2080/81', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' },
          { id: '2', name: '2081/82', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' },
        ],
        rules: [],
      };
      await assert.rejects(
        () => billingRulesApi.save(config, { version: 1, feeHeads: [], fiscalYears: [], rules: [] }),
        /आर्थिक वर्षमध्ये एउटा मात्र पूर्वनिर्धारित वर्ष छान्नुहोस्।/,
      );
    });

    test('throws if inactive fiscal year is set as default', async () => {
      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [],
        fiscalYears: [
          { id: '1', name: '2080/81', status: 'INACTIVE', isDefault: true, startDate: '', endDate: '' },
        ],
        rules: [],
      };
      await assert.rejects(
        () => billingRulesApi.save(config, { version: 1, feeHeads: [], fiscalYears: [], rules: [] }),
        /निष्क्रिय आर्थिक वर्षलाई पूर्वनिर्धारित बनाउन मिल्दैन।/,
      );
    });

    test('throws if fee head has no fiscal year ID when required', async () => {
      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [
          { id: 'fh-1', name: 'New Fee', code: 'NF', fiscalYearId: null, status: 'ACTIVE' },
        ],
        fiscalYears: [],
        rules: [],
      };
      await assert.rejects(
        () => billingRulesApi.save(config, { version: 1, feeHeads: [], fiscalYears: [], rules: [] }),
        /शुल्क शीर्षकको आर्थिक वर्ष छान्नुहोस्।/,
      );
    });

    test('throws if billing rule fiscal year does not match fee head fiscal year', async () => {
      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [
          { id: 'fh-1', name: 'Fee A', code: 'FA', fiscalYearId: 'year-1', status: 'ACTIVE' },
        ],
        fiscalYears: [
          { id: 'year-1', name: '2080/81', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' },
          { id: 'year-2', name: '2081/82', status: 'ACTIVE', isDefault: false, startDate: '', endDate: '' },
        ],
        rules: [
          {
            id: 'rule-1',
            feeHeadId: 'fh-1',
            fiscalYearId: 'year-2',
            billingEntityId: null,
            scope: 'COMMON',
            vehicleCategoryId: null,
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 100,
            status: 'ACTIVE',
          },
        ],
      };

      await assert.rejects(
        () => billingRulesApi.save(config, { version: 1, feeHeads: [config.feeHeads[0]], fiscalYears: config.fiscalYears, rules: [] }),
        /शुल्क शीर्षक र बिलिङ नियमको आर्थिक वर्ष मिलेन।/,
      );
    });

    test('allows matching canonical fiscal year labels when the API returns a numeric fee-head fiscal year', async () => {
      apiClient.post = async <T>(path: string, payload?: unknown): Promise<T> => {
        const record = payload as { inner_content: { resourceType: string; name: string; fiscalYearId: unknown } };
        if (record.inner_content.resourceType === 'FEE_HEAD') {
          return {
            id: 41,
            resource_name: 'BillingRuleResource',
            inner_content: {
              resourceType: 'FEE_HEAD',
              name: record.inner_content.name,
              fiscalYearId: 5,
              status: 'ACTIVE',
            },
          } as T;
        }
        return {
          id: 42,
          resource_name: 'BillingRuleResource',
          inner_content: record.inner_content,
        } as T;
      };

      const config: BillingRuleConfig = {
        version: 1,
        feeHeads: [
          { id: 'fh-new', name: 'बिलम्ब बापत', code: 'LATE', fiscalYearId: '2083/84', status: 'ACTIVE' },
        ],
        fiscalYears: [
          { id: '2083/84', code: '2083/84', name: '2083/84', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' },
        ],
        rules: [
          {
            id: 'rule-new',
            feeHeadId: 'fh-new',
            fiscalYearId: '2083/84',
            billingEntityId: 'entity-1',
            scope: 'COMMON',
            vehicleCategoryId: null,
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 100,
            status: 'ACTIVE',
          },
        ],
      };

      const saved = await billingRulesApi.save(config, { version: 1, feeHeads: [], fiscalYears: config.fiscalYears, rules: [] });
      assert.equal(saved.config.feeHeads[0].fiscalYearId, '2083/84');
      assert.equal(saved.config.rules[0].fiscalYearId, '2083/84');
    });

    test('deletes removed rules without deleting unrelated resources', async () => {
      const deletedIds: string[] = [];
      apiClient.delete = async <T>(path: string): Promise<T> => {
        deletedIds.push(path);
        return undefined as unknown as T;
      };

      const previousConfig: BillingRuleConfig = {
        version: 1,
        feeHeads: [{ id: 'fh-1', name: 'Fee 1', code: 'F1', fiscalYearId: 'y-1', status: 'ACTIVE' }],
        fiscalYears: [{ id: 'y-1', name: '2081/82', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' }],
        rules: [
          {
            id: 'rule-keep',
            feeHeadId: 'fh-1',
            fiscalYearId: 'y-1',
            billingEntityId: null,
            scope: 'COMMON',
            vehicleCategoryId: null,
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 100,
            status: 'ACTIVE',
          },
          {
            id: 'rule-delete',
            feeHeadId: 'fh-1',
            fiscalYearId: 'y-1',
            billingEntityId: null,
            scope: 'COMMON',
            vehicleCategoryId: null,
            frequency: 'ONE_TIME',
            period: null,
            validity: 'SAME_DAY',
            amount: 200,
            status: 'ACTIVE',
          },
        ],
      };

      const nextConfig: BillingRuleConfig = {
        ...previousConfig,
        rules: [previousConfig.rules[0]],
      };

      await billingRulesApi.save(nextConfig, previousConfig);
      assert.equal(deletedIds.length, 1);
      assert.ok(deletedIds[0].includes('rule-delete'));
      assert.ok(!deletedIds[0].includes('rule-keep'));
    });

    test('deduplicates concurrent fee-head creation requests with the same name and fiscal year', async () => {
      let postCount = 0;
      let releaseFirstPost: () => void = () => {};
      const deferredFirstPost = new Promise<void>((resolve) => {
        releaseFirstPost = resolve;
      });

      apiClient.post = async <T>(_path: string, payload?: unknown): Promise<T> => {
        postCount += 1;
        await deferredFirstPost;
        const record = payload as { inner_content: { name: string; fiscalYearId: string } };
        return {
          id: 901,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'FEE_HEAD',
            name: record.inner_content.name,
            fiscalYearId: record.inner_content.fiscalYearId,
            status: 'ACTIVE',
          },
        } as T;
      };

      const previousConfig: BillingRuleConfig = {
        version: 1,
        feeHeads: [],
        fiscalYears: [
          { id: '2083/84', code: '2083/84', name: '2083/84', status: 'ACTIVE', isDefault: true, startDate: '', endDate: '' },
        ],
        rules: [],
      };

      const firstSave = billingRulesApi.save({
        ...previousConfig,
        feeHeads: [
          { id: 'uuid-click-1', code: '', fiscalYearId: '2083/84', name: 'सदस्यता नवीकरण', status: 'ACTIVE' },
        ],
      }, previousConfig);

      const secondSave = billingRulesApi.save({
        ...previousConfig,
        feeHeads: [
          { id: 'uuid-click-2', code: '', fiscalYearId: '2083/84', name: '  सदस्यता   नवीकरण ', status: 'ACTIVE' },
        ],
      }, previousConfig);

      await Promise.resolve();
      releaseFirstPost();

      const [firstResult, secondResult] = await Promise.all([firstSave, secondSave]);
      assert.equal(postCount, 1);
      assert.equal(firstResult.config.feeHeads[0]?.id, '901');
      assert.equal(secondResult.config.feeHeads[0]?.id, '901');
    });

    test('enforces single-submit locking in FeeHeadDialog and FeeHeadManager', () => {
      const dialogSource = readWorkspaceFile('features', 'billing-rules', 'components', 'configuration', 'FeeHeadDialog.tsx');
      const managerSource = readWorkspaceFile('features', 'billing-rules', 'components', 'configuration', 'FeeHeadManager.tsx');

      assert.ok(dialogSource.includes('isSubmittingRef'), 'FeeHeadDialog should use a synchronous ref guard');
      assert.ok(dialogSource.includes('const busy = isSaving || isSubmitting;'), 'FeeHeadDialog should disable inputs and Save while busy');
      assert.ok(dialogSource.includes('disabled={busy || !value.name.trim() || !value.fiscalYearId || Boolean(duplicateFeeHead)}'), 'Save button should stay disabled while saving or duplicate');
      assert.ok(managerSource.includes('isSaving={isSaving}'), 'FeeHeadManager should forward isSaving to FeeHeadDialog');
      assert.ok(managerSource.includes('isSubmittingFeeHeadRef'), 'FeeHeadManager should guard rapid repeated submissions');
    });
  });

  describe('BillingRuleResource parsing and legacy fiscalYearId resolution in billingRulesApi.list', () => {
    test('parses string inner_content, string fiscalYear, FEE_HEAD with fiscalYear, and ONE_TIME rule with omitted period', () => {
      const ruleDoc = mapBillingRuleResource({
        id: 701,
        resource_name: 'BillingRuleResource',
        inner_content: JSON.stringify({
          resourceType: 'BILLING_RULE',
          scope: 'COMMON',
          frequency: 'ONE_TIME',
          validity: 'SAME_DAY',
          amount: 250,
          status: 'ACTIVE',
          feeHead: { id: 21, name: 'सदस्यता शुल्क', fiscalYear: '२०८२/८३' },
          fiscalYear: '2082/83',
        }),
      });
      assert.equal(ruleDoc.config.rules.length, 1);
      assert.equal(ruleDoc.config.rules[0].fiscalYearId, '2082/83');
      assert.equal(ruleDoc.config.rules[0].period, null);
      assert.equal(ruleDoc.config.feeHeads[0].fiscalYearId, '2082/83');

      const feeHeadDoc = mapBillingRuleResource({
        id: 702,
        resource_name: 'BillingRuleResource',
        inner_content: {
          resourceType: 'FEE_HEAD',
          name: 'वार्षिक शुल्क',
          fiscalYear: '2082/83',
          status: 'ACTIVE',
        },
      });
      assert.equal(feeHeadDoc.config.feeHeads[0].fiscalYearId, '2082/83');
    });

    test('resolves legacy UUID fiscalYearIds via SettingResource cross-references and effectiveDate, and preserves unmapped IDs', async () => {
      const billingResources = [
        {
          id: 3,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'FEE_HEAD',
            name: 'स्रोत शुल्क',
            fiscalYearId: '15f21721-50e8-41af-9596-9d8cdb8d6a16',
            status: 'ACTIVE',
          },
        },
        {
          id: 21,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'FEE_HEAD',
            name: 'लिंक शुल्क',
            fiscalYearId: 'uuid-from-linked-only',
            status: 'ACTIVE',
          },
        },
        {
          id: 5,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'BILLING_RULE',
            scope: 'VEHICLE_TYPE',
            vehicleCategoryId: 4,
            frequency: 'PERIODIC',
            period: 'MONTH',
            validity: 'END_OF_MONTH',
            amount: 500,
            status: 'ACTIVE',
            feeHead: { id: 3, name: 'स्रोत शुल्क' },
            fiscalYearId: '15f21721-50e8-41af-9596-9d8cdb8d6a16',
          },
        },
        {
          id: 6,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'BILLING_RULE',
            scope: 'COMMON',
            frequency: 'ONE_TIME',
            validity: 'SAME_DAY',
            amount: 300,
            status: 'ACTIVE',
            effectiveDate: '2025-07-17',
            feeHead: { id: 3, name: 'स्रोत शुल्क' },
            fiscalYearId: 'uuid-ad-date-2082',
          },
        },
        {
          id: 7,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'BILLING_RULE',
            scope: 'COMMON',
            frequency: 'ONE_TIME',
            validity: 'SAME_DAY',
            amount: 400,
            status: 'ACTIVE',
            effectiveDate: '२०८२-०४-०५',
            feeHead: { id: 3, name: 'स्रोत शुल्क' },
            fiscalYearId: 'uuid-bs-date-2082',
          },
        },
        {
          id: 8,
          resource_name: 'BillingRuleResource',
          inner_content: {
            resourceType: 'BILLING_RULE',
            scope: 'COMMON',
            frequency: 'ONE_TIME',
            validity: 'SAME_DAY',
            amount: 999,
            status: 'ACTIVE',
            feeHead: { id: 3, name: 'स्रोत शुल्क' },
            fiscalYearId: 'legacy-unmapped-uuid',
          },
        },
      ];

      const settingResources = [
        {
          id: 1,
          resource_name: 'SettingResource',
          inner_content: {
            schemaVersion: 1,
            integrations: { tqms: { SanghBranch: 'Loadboard sthaniya' } },
            fiscalYear: { selector: { yearsBack: 4, yearsForward: 1, archivedYears: [] } },
            billing: {
              arrears: {
                monthlyPaid: { enabled: true, fiscalYear: '2082/83', billingRuleId: '5' },
                paidExpired: { enabled: true, billingRuleId: '5' },
              },
              linkedFeeRules: {
                enabled: true,
                rules: [
                  {
                    id: 'link-1',
                    active: true,
                    fiscalYear: '2082/83',
                    sourceFeeHeadId: '3',
                    linkedFeeHeadId: '21',
                    oncePerFiscalYear: true,
                  },
                ],
              },
            },
          },
        },
      ];

      apiClient.get = async <T>(path: string): Promise<T> => {
        if (path.includes('BillingRuleResource')) return billingResources as T;
        if (path.includes('SettingResource')) return settingResources as T;
        throw new Error(`Unexpected GET ${path}`);
      };

      const doc = await billingRulesApi.list();
      const rule5 = doc.config.rules.find((r) => r.id === '5');
      const rule6 = doc.config.rules.find((r) => r.id === '6');
      const rule7 = doc.config.rules.find((r) => r.id === '7');
      const rule8 = doc.config.rules.find((r) => r.id === '8');
      const feeHead3 = doc.config.feeHeads.find((fh) => fh.id === '3');
      const feeHead21 = doc.config.feeHeads.find((fh) => fh.id === '21');

      assert.equal(rule5?.fiscalYearId, '2082/83');
      assert.equal(rule6?.fiscalYearId, '2082/83');
      assert.equal(rule7?.fiscalYearId, '2082/83');
      assert.equal(rule8?.fiscalYearId, 'legacy-unmapped-uuid');
      assert.equal(feeHead3?.fiscalYearId, '2082/83');
      assert.equal(feeHead21?.fiscalYearId, '2082/83');
      assert.ok(doc.config.fiscalYears.some((y) => y.id === '2082/83'));
      assert.ok(doc.config.fiscalYears.some((y) => y.id === 'legacy-unmapped-uuid'));
    });
  });
});
