import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInsuranceEligibilityRuleOptions,
  DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS,
  fetchInsuranceEligibilitySettings,
  INSURANCE_ELIGIBILITY_SETTING_KEY,
  saveInsuranceEligibilitySettings,
  summarizeInsuranceEligibilitySelection,
  validateInsuranceEligibilitySettings,
} from '@/features/settings/api/insurance-eligibility.api';
import type { BillingRule, FeeHead, FiscalYear } from '@/features/billing-rules/model/types';
import type { VehicleTypeRecord } from '@/features/vehicle/type/types/vehicle-type.types';
import { apiClient } from '@/lib/api/client';

describe('Insurance Eligibility Settings', () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
  });

  describe('fetchInsuranceEligibilitySettings', () => {
    test('falls back to default settings when SettingResource list is empty or 404', async () => {
      apiClient.get = async <T>(): Promise<T> => ([] as T);
      assert.deepEqual(await fetchInsuranceEligibilitySettings(), {
        resourceId: null,
        settings: DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS,
      });

      apiClient.get = async () => {
        throw new Error('Request failed (404): No resources found for resource name: SettingResource');
      };
      assert.deepEqual(await fetchInsuranceEligibilitySettings(), {
        resourceId: null,
        settings: DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS,
      });
    });

    test('rethrows unexpected server errors', async () => {
      apiClient.get = async () => {
        throw new Error('Request failed (500): Internal Server Error');
      };
      await assert.rejects(fetchInsuranceEligibilitySettings, /Request failed \(500\)/);
    });

    test('parses nested SettingResource envelopes, stringified inner_content, and deduplicates ruleIds', async () => {
      apiClient.get = async <T>(): Promise<T> => ({
        data: {
          items: [
            {
              id: 10,
              resource_name: 'SettingResource',
              inner_content: JSON.stringify({ key: 'organization-vat', enabled: false, rate: 13, billingEntityIds: [] }),
            },
            {
              id: 42,
              resource_name: 'SettingResource',
              inner_content: JSON.stringify({
                key: INSURANCE_ELIGIBILITY_SETTING_KEY,
                enabled: true,
                ruleIds: ['rule-1', ' rule-2 ', 'rule-1', ''],
                minPaidRules: 2,
              }),
            },
          ],
        },
      } as T);

      assert.deepEqual(await fetchInsuranceEligibilitySettings(), {
        resourceId: '42',
        settings: {
          enabled: true,
          ruleIds: ['rule-1', 'rule-2'],
          minPaidRules: 2,
        },
      });
    });

    test('rejects malformed stored settings and duplicate setting records', async () => {
      apiClient.get = async <T>(): Promise<T> => ([{
        id: '42',
        resource_name: 'SettingResource',
        inner_content: {
          key: INSURANCE_ELIGIBILITY_SETTING_KEY,
          enabled: true,
          ruleIds: ['rule-1'],
          minPaidRules: 0,
        },
      }] as T);
      await assert.rejects(fetchInsuranceEligibilitySettings, /अमान्य छ/);

      apiClient.get = async <T>(): Promise<T> => ([
        {
          id: '1',
          resource_name: 'SettingResource',
          inner_content: { key: INSURANCE_ELIGIBILITY_SETTING_KEY, enabled: false, ruleIds: [], minPaidRules: 1 },
        },
        {
          id: '2',
          resource_name: 'SettingResource',
          inner_content: { key: INSURANCE_ELIGIBILITY_SETTING_KEY, enabled: true, ruleIds: ['r1'], minPaidRules: 1 },
        },
      ] as T);
      await assert.rejects(fetchInsuranceEligibilitySettings, /एकभन्दा बढी/);
    });
  });

  describe('saveInsuranceEligibilitySettings & validation', () => {
    test('validates enabled, minPaidRules bounds, and ruleIds consistency', () => {
      assert.throws(
        () => validateInsuranceEligibilitySettings({ enabled: true, ruleIds: [], minPaidRules: 1 }),
        /कम्तीमा एउटा billing rule छान्नुहोस्/,
      );
      assert.throws(
        () => validateInsuranceEligibilitySettings({ enabled: false, ruleIds: ['r1'], minPaidRules: 0 }),
        /१ वा सोभन्दा बढी/,
      );
      assert.throws(
        () => validateInsuranceEligibilitySettings({ enabled: true, ruleIds: ['r1'], minPaidRules: 1.5 }),
        /१ वा सोभन्दा बढी/,
      );
      assert.throws(
        () => validateInsuranceEligibilitySettings({ enabled: true, ruleIds: ['r1', 'r2'], minPaidRules: 3 }),
        /छानिएका नियम \(2\) भन्दा बढी/,
      );
      assert.deepEqual(
        validateInsuranceEligibilitySettings({ enabled: false, ruleIds: [], minPaidRules: 1 }),
        { enabled: false, ruleIds: [], minPaidRules: 1 },
      );
    });

    test('creates a new SettingResource with deduplicated ruleIds when resourceId is null', async () => {
      let capturedPath = '';
      let capturedBody: Record<string, unknown> | undefined;
      apiClient.get = async <T>(): Promise<T> => ([] as T);
      apiClient.post = async <T>(path: string, body?: unknown): Promise<T> => {
        capturedPath = path;
        capturedBody = body as Record<string, unknown>;
        return { data: { id: 88 } } as T;
      };

      const saved = await saveInsuranceEligibilitySettings(
        { enabled: true, ruleIds: ['r1', 'r2', 'r1', '  '], minPaidRules: 1 },
        { resourceId: null, settings: DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS },
      );

      assert.equal(capturedPath, 'create/SettingResource');
      assert.equal(capturedBody?.resource_name, 'SettingResource');
      assert.equal((capturedBody?.inner_content as Record<string, unknown>)?.schemaVersion, 1);
      assert.deepEqual(((capturedBody?.inner_content as Record<string, unknown>)?.insurance as Record<string, unknown>)?.eligibility, {
        enabled: true,
        ruleIds: ['r1', 'r2'],
        minPaidRules: 1,
      });
      assert.deepEqual(saved, {
        resourceId: '88',
        settings: { enabled: true, ruleIds: ['r1', 'r2'], minPaidRules: 1 },
      });
    });

    test('updates existing SettingResource with numeric id as integer', async () => {
      let capturedPath = '';
      let capturedBody: Record<string, unknown> | undefined;
      apiClient.get = async <T>(): Promise<T> => ([{
        id: 42,
        resource_name: 'SettingResource',
        inner_content: {
          schemaVersion: 1,
          integrations: {
            tqms: { SanghBranch: 'Loadboard sthaniya' },
          },
        },
      }] as T);
      apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
        capturedPath = path;
        capturedBody = body as Record<string, unknown>;
        return undefined as T;
      };

      const saved = await saveInsuranceEligibilitySettings(
        { enabled: true, ruleIds: ['r1', 'r2'], minPaidRules: 2 },
        { resourceId: '42', settings: DEFAULT_INSURANCE_ELIGIBILITY_SETTINGS },
      );

      assert.equal(capturedPath, 'update/SettingResource/42');
      assert.equal(capturedBody?.id, 42);
      assert.equal(typeof capturedBody?.id, 'number');
      assert.equal(capturedBody?.resource_name, 'SettingResource');
      const inner = capturedBody?.inner_content as Record<string, unknown>;
      assert.equal(((inner?.integrations as Record<string, unknown>)?.tqms as Record<string, unknown>)?.SanghBranch, 'Loadboard sthaniya');
      assert.deepEqual((inner?.insurance as Record<string, unknown>)?.eligibility, {
        enabled: true,
        ruleIds: ['r1', 'r2'],
        minPaidRules: 2,
      });
      assert.equal(saved.resourceId, '42');
    });
  });

  describe('buildInsuranceEligibilityRuleOptions & summarizeInsuranceEligibilitySelection', () => {
    const feeHeads: FeeHead[] = [
      { id: 'fh-1', fiscalYearId: 'fy-1', name: 'प्रवेश सहयोग', status: 'ACTIVE' },
      { id: 'fh-2', fiscalYearId: 'fy-1', name: 'स टू हितकोष सहयोग', status: 'ACTIVE' },
      { id: 'fh-3', fiscalYearId: 'fy-1', name: 'सदस्यता शुल्क', status: 'ACTIVE' },
    ];
    const fiscalYears: FiscalYear[] = [
      { id: 'fy-1', name: '2083/84', startDate: '2083-04-01', endDate: '2084-03-31', status: 'ACTIVE', isDefault: true },
    ];
    const vehicleCategories: VehicleTypeRecord[] = [
      { id: 'cat-1', category: 'कन्टेनर / बल्गर ६ चक्के', vehicleTypes: ['Container'] },
      { id: 'cat-2', category: 'कन्टेनर / बल्गर / १० चक्के वा १२ चक्के', vehicleTypes: ['Container 10'] },
    ];
    const rules: BillingRule[] = [
      {
        id: 'r-common',
        feeHeadId: 'fh-3',
        fiscalYearId: 'fy-1',
        billingEntityId: 'be-1',
        scope: 'COMMON',
        vehicleCategoryId: null,
        frequency: 'ONE_TIME',
        period: null,
        validity: 'SAME_DAY',
        amount: 500,
        status: 'ACTIVE',
      },
      {
        id: 'r-vt-1',
        feeHeadId: 'fh-1',
        fiscalYearId: 'fy-1',
        billingEntityId: 'be-1',
        scope: 'VEHICLE_TYPE',
        vehicleCategoryId: 'cat-1',
        frequency: 'ONE_TIME',
        period: null,
        validity: 'SAME_DAY',
        amount: 1000,
        status: 'ACTIVE',
      },
      {
        id: 'r-vt-2',
        feeHeadId: 'fh-2',
        fiscalYearId: 'fy-1',
        billingEntityId: 'be-1',
        scope: 'VEHICLE_TYPE',
        vehicleCategoryId: 'cat-2',
        frequency: 'PERIODIC',
        period: 'MONTH',
        validity: 'END_OF_MONTH',
        amount: 3560,
        status: 'ACTIVE',
      },
      {
        id: 'r-inactive',
        feeHeadId: 'fh-1',
        fiscalYearId: 'fy-1',
        billingEntityId: 'be-1',
        scope: 'VEHICLE_TYPE',
        vehicleCategoryId: 'cat-2',
        frequency: 'ONE_TIME',
        period: null,
        validity: 'SAME_DAY',
        amount: 200,
        status: 'INACTIVE',
      },
    ];

    test('builds options only for active rules and summarizes Common vs Vehicle Type selections', () => {
      const options = buildInsuranceEligibilityRuleOptions({
        rules,
        feeHeads,
        fiscalYears,
        vehicleCategories,
      });

      assert.equal(options.length, 3);
      assert.equal(options.some((o) => o.rule.id === 'r-inactive'), false);
      assert.equal(options[0].label, 'सदस्यता शुल्क');
      assert.equal(options[1].label, 'प्रवेश सहयोग • कन्टेनर / बल्गर ६ चक्के');

      const summary = summarizeInsuranceEligibilitySelection(options, ['r-vt-1', 'r-vt-2', 'r-inactive']);
      assert.equal(summary.totalVisibleCount, 3);
      assert.equal(summary.selectedCount, 2);
      assert.equal(summary.commonRules.length, 0);
      assert.equal(summary.vehicleTypeRules.length, 2);
    });
  });
});
