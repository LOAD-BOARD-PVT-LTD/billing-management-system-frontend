import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_GROUPED_SETTINGS,
  fetchGroupedSettingsDocument,
} from '@/features/settings/api/grouped-settings.api';
import {
  deriveCalendarFiscalYears,
  fetchFiscalYearManagement,
  updateBillingFiscalYearAccess,
} from '@/features/settings/api/fiscal-year-management.api';
import { saveTqmsSanghBranchFilter } from '@/features/settings/api/tqms-sangh-branch-filter.api';
import { saveArrearsRuleSettings } from '@/features/vehicle/compliance/api/arrears-settings.api';
import { saveLinkedFeeRules } from '@/features/settings/api/linked-fee-rules.api';
import { fetchNotificationSettings, saveNotificationSettings } from '@/features/notifications/api/notification-settings.api';
import { vehicleResourceToBillingVehicle } from '@/features/reconciliation';
import type { VehicleResourceDocument } from '@/features/billing/api/vehicle-resource.api';
import { apiClient } from '@/lib/api/client';

describe('Grouped SettingResource, Migration, Multi-Active Fiscal Year, and Vehicle SMS Metadata', () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
  });

  test('migrates legacy keyed SettingResource records into SettingResource/1 for Loadboard sthaniya without losing values', async () => {
    const legacyResources = [
      {
        id: 7,
        resource_name: 'SettingResource',
        inner_content: { key: 'organization-vat', rate: 13, enabled: true, billingEntityIds: ['1'] },
        external_content: null,
      },
      {
        id: 6,
        resource_name: 'SettingResource',
        inner_content: {
          key: 'arrears-list-rules',
          monthlyPaid: { enabled: true, fiscalYearId: '15f21721-50e8-41af-9596-9d8cdb8d6a16', billingRuleId: '5' },
          paidExpired: { enabled: true, billingRuleId: '5' },
        },
        external_content: null,
      },
      {
        id: 5,
        resource_name: 'SettingResource',
        inner_content: {
          key: 'linked-fee-rules',
          rules: [
            {
              id: 'f72c97c7-ddd4-4d35-bbdd-86e4746e57db',
              active: true,
              fiscalYearId: '15f21721-50e8-41af-9596-9d8cdb8d6a16',
              linkedFeeHeadId: '21',
              sourceFeeHeadId: '3',
              oncePerFiscalYear: true,
            },
          ],
          enabled: true,
        },
        external_content: null,
      },
      {
        id: 3,
        resource_name: 'SettingResource',
        inner_content: { key: 'fiscal-year-selector', yearsBack: 4, yearsForward: 1, archivedYears: [] },
        external_content: null,
      },
      {
        id: 1,
        resource_name: 'SettingResource',
        inner_content: { key: 'tqms-sangh-branch-filter', branchName: 'Loadboard sthaniya' },
        external_content: null,
      },
      {
        id: 4,
        resource_name: 'SettingResource',
        inner_content: { key: 'billing-sms-phone', phone: '9600331176', vehicleId: '23437' },
        external_content: { phoneChangeReason: 'Number pariwartan bhayeko' },
      },
      {
        id: 2,
        resource_name: 'SettingResource',
        inner_content: {
          key: 'fiscal-year-management',
          fiscalYears: [{ id: '15f21721-50e8-41af-9596-9d8cdb8d6a16', code: '2082/83', name: '2082/83', status: 'ACTIVE', endDate: '2026-07-16', startDate: '2025-07-17' }],
        },
        external_content: null,
      },
    ];

    let putPath = '';
    let putBody: Record<string, unknown> | undefined;
    apiClient.get = async <T>(): Promise<T> => (legacyResources as T);
    apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
      putPath = path;
      putBody = body as Record<string, unknown>;
      return undefined as T;
    };

    const doc = await fetchGroupedSettingsDocument();
    assert.equal(doc.resourceId, '1');
    assert.equal(doc.needsMigration, true);
    assert.equal(doc.settings.SanghBranch, 'Loadboard sthaniya');
    assert.deepEqual(doc.settings.vat, { enabled: true, rate: 13, billingEntityIds: ['1'] });
    assert.equal(doc.settings.arrears.monthlyPaid.billingRuleId, '5');
    assert.equal(doc.settings.linkedFeeRules.enabled, true);
    assert.equal(doc.settings.linkedFeeRules.rules.length, 1);
    assert.deepEqual(doc.settings.fiscalYear.billingAccess, {
      previousYear: null,
      nextYear: null,
    });

    // Saving any section writes the consolidated object to SettingResource/1
    await saveLinkedFeeRules(doc.settings.linkedFeeRules, { resourceId: doc.resourceId, settings: doc.settings.linkedFeeRules });
    assert.equal(putPath, 'update/SettingResource/1');
    assert.equal(putBody?.id, 1);
    const savedContent = putBody?.inner_content as Record<string, unknown>;
    assert.equal(((savedContent.integrations as Record<string, unknown>).tqms as Record<string, unknown>).SanghBranch, 'Loadboard sthaniya');
    assert.deepEqual((savedContent.billing as Record<string, unknown>).vat, { enabled: true, rate: 13, billingEntityIds: ['1'] });
  });

  test('fetchGroupedSettingsDocument matches record by SanghBranch and preserves all sections including string activeFiscalYears', async () => {
    apiClient.get = async <T>(): Promise<T> => ([
      {
        id: 11,
        resource_name: 'SettingResource',
        inner_content: {
          schemaVersion: 1,
          integrations: { tqms: { SanghBranch: 'Other Branch' } },
          billing: { vat: { enabled: false, rate: 13, billingEntityIds: [] } },
        },
      },
      {
        id: 12,
        resource_name: 'SettingResource',
        inner_content: {
          schemaVersion: 1,
          integrations: { tqms: { SanghBranch: 'Loadboard sthaniya' } },
          fiscalYear: {
            selector: { yearsBack: 4, yearsForward: 1, archivedYears: [] },
            activeFiscalYears: '2083/84',
            billingAccess: {
              previousYear: {
                fiscalYear: '2082/83',
                status: 'OPEN',
                updatedAt: '2026-11-22T05:56:33.000Z',
                updatedBy: 'System Administrator',
              },
              nextYear: null,
            },
          },
          billing: {
            arrears: {
              monthlyPaid: { enabled: true, fiscalYear: '2082/83', billingRuleId: '5' },
              paidExpired: { enabled: true, billingRuleId: '5' },
            },
            linkedFeeRules: {
              enabled: true,
              rules: [
                {
                  id: 'r1',
                  active: true,
                  fiscalYear: '2082/83',
                  linkedFeeHeadId: '21',
                  sourceFeeHeadId: '3',
                  oncePerFiscalYear: true,
                },
              ],
            },
            vat: { enabled: true, rate: 13, billingEntityIds: ['1'] },
          },
        },
      },
    ] as T);

    const doc = await fetchGroupedSettingsDocument('loadboard sthaniya');
    assert.equal(doc.resourceId, '12');
    assert.equal(doc.settings.SanghBranch, 'Loadboard sthaniya');
    assert.deepEqual(doc.settings.fiscalYear.billingAccess, {
      previousYear: {
        fiscalYear: '2082/83',
        status: 'OPEN',
        updatedAt: '2026-11-22T05:56:33.000Z',
        updatedBy: 'System Administrator',
      },
      nextYear: null,
    });
    assert.equal(doc.settings.arrears.monthlyPaid.fiscalYearId, '2082/83');
    assert.equal(doc.settings.arrears.monthlyPaid.billingRuleId, '5');
    assert.equal(doc.settings.linkedFeeRules.enabled, true);
    assert.equal(doc.settings.linkedFeeRules.rules[0].fiscalYearId, '2082/83');
    assert.deepEqual(doc.settings.vat, { enabled: true, rate: 13, billingEntityIds: ['1'] });
  });

  test('updating one section or smsSettings preserves sibling sections and SanghBranch', async () => {
    let putBody: Record<string, unknown> | undefined;
    apiClient.get = async <T>(): Promise<T> => ([{
      id: 1,
      resource_name: 'SettingResource',
      inner_content: {
        schemaVersion: 1,
        integrations: { tqms: { SanghBranch: 'Loadboard sthaniya' } },
        billing: {
          vat: { enabled: true, rate: 13, billingEntityIds: ['1'] },
        },
      },
    }] as T);
    apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
      putBody = body as Record<string, unknown>;
      return undefined as T;
    };

    await saveArrearsRuleSettings(
      {
        paidExpired: { enabled: true, billingRuleId: '5' },
        monthlyPaid: { enabled: true, fiscalYearId: '2083/84', billingRuleId: '5' },
      },
      { resourceId: '1', settings: DEFAULT_GROUPED_SETTINGS.arrears },
    );

    const content = putBody?.inner_content as Record<string, unknown>;
    assert.equal(putBody?.id, 1);
    assert.equal(((content.integrations as Record<string, unknown>).tqms as Record<string, unknown>).SanghBranch, 'Loadboard sthaniya');
    assert.deepEqual((content.billing as Record<string, unknown>).vat, { enabled: true, rate: 13, billingEntityIds: ['1'] });

    const smsDoc = await fetchNotificationSettings();
    await saveNotificationSettings(smsDoc.settings, smsDoc);
    assert.deepEqual(((putBody?.inner_content as Record<string, unknown>).billing as Record<string, unknown>).vat, { enabled: true, rate: 13, billingEntityIds: ['1'] });

    await saveTqmsSanghBranchFilter('Loadboard sthaniya', { resourceId: '1', branchName: '' });
  });

  test('current fiscal year is always auto-active and previous/next year billing access can be opened and closed', async () => {
    let serverSetting = {
      id: 1,
      resource_name: 'SettingResource',
      inner_content: {
        schemaVersion: 1,
        integrations: { tqms: { SanghBranch: 'Loadboard sthaniya' } },
        fiscalYear: {
          selector: { yearsBack: 4, yearsForward: 1, archivedYears: [] },
          billingAccess: { previousYear: null, nextYear: null },
        },
        billing: {
          vat: { enabled: true, rate: 13, billingEntityIds: ['1'] },
          arrears: {
            monthlyPaid: { enabled: true, fiscalYear: '2082/83', billingRuleId: '5' },
            paidExpired: { enabled: true, billingRuleId: '5' },
          },
          linkedFeeRules: { enabled: true, rules: [] },
        },
        notifications: { sms: { templates: DEFAULT_GROUPED_SETTINGS.smsSettings.templates } },
      },
    };
    let lastPutBody: Record<string, unknown> | undefined;
    const baseDate = new Date('2026-11-22T06:00:00Z'); // BS 2083 (Mangsir) -> 2083/84
    apiClient.get = async <T>(): Promise<T> => ([serverSetting] as T);
    apiClient.put = async <T>(_path: string, body?: unknown): Promise<T> => {
      lastPutBody = body as Record<string, unknown>;
      serverSetting = lastPutBody as typeof serverSetting;
      return undefined as T;
    };

    const initial = await fetchFiscalYearManagement(baseDate);
    assert.equal(initial.currentFiscalYear, '2083/84');
    assert.equal(initial.previousYearControl.fiscalYear, '2082/83');
    assert.equal(initial.previousYearControl.status, 'CLOSED');
    assert.equal(initial.nextYearControl.fiscalYear, '2084/85');
    assert.equal(initial.nextYearControl.status, 'CLOSED');
    assert.deepEqual(initial.billingFiscalYears.map((y) => y.name), ['2083/84']);
    const defaultYear = initial.fiscalYears.find((y) => y.isDefault);
    assert.equal(defaultYear?.name, '2083/84');
    assert.equal(defaultYear?.status, 'ACTIVE');

    // Open previous year (2082/83)
    const openedPrevAt = new Date('2026-11-22T06:05:00Z');
    const afterOpenPrev = await updateBillingFiscalYearAccess(
      'previousYear',
      'OPEN',
      'System Administrator',
      initial,
      baseDate,
      openedPrevAt,
    );
    assert.equal(afterOpenPrev.previousYearControl.status, 'OPEN');
    assert.equal(afterOpenPrev.previousYearControl.updatedAt, '2026-11-22T06:05:00.000Z');
    assert.equal(afterOpenPrev.previousYearControl.updatedBy, 'System Administrator');
    assert.deepEqual(afterOpenPrev.billingFiscalYears.map((y) => y.name), ['2083/84', '2082/83']);

    const innerAfterPrev = lastPutBody?.inner_content as Record<string, unknown>;
    assert.deepEqual((innerAfterPrev.billing as Record<string, unknown>).vat, {
      enabled: true,
      rate: 13,
      billingEntityIds: ['1'],
    });
    assert.equal(
      ((innerAfterPrev.integrations as Record<string, unknown>).tqms as Record<string, unknown>).SanghBranch,
      'Loadboard sthaniya',
    );
    assert.equal('activeFiscalYears' in (innerAfterPrev.fiscalYear as Record<string, unknown>), false);

    // Open next year (2084/85)
    const openedNextAt = new Date('2026-11-22T06:10:00Z');
    const afterOpenNext = await updateBillingFiscalYearAccess(
      'nextYear',
      'OPEN',
      'System Administrator',
      afterOpenPrev,
      baseDate,
      openedNextAt,
    );
    assert.equal(afterOpenNext.nextYearControl.status, 'OPEN');
    assert.deepEqual(
      afterOpenNext.billingFiscalYears.map((y) => y.name),
      ['2084/85', '2083/84', '2082/83'],
    );

    // Close next year (2084/85)
    const closedNextAt = new Date('2026-11-22T06:15:00Z');
    const afterCloseNext = await updateBillingFiscalYearAccess(
      'nextYear',
      'CLOSED',
      'Ram Admin',
      afterOpenNext,
      baseDate,
      closedNextAt,
    );
    assert.equal(afterCloseNext.nextYearControl.status, 'CLOSED');
    assert.equal(afterCloseNext.nextYearControl.updatedAt, '2026-11-22T06:15:00.000Z');
    assert.equal(afterCloseNext.nextYearControl.updatedBy, 'Ram Admin');
    assert.deepEqual(afterCloseNext.billingFiscalYears.map((y) => y.name), ['2083/84', '2082/83']);

    // Automatic transition & reset when calendar rolls into 2084/85 (Shrawan BS 2084)
    const rolledOver = await fetchFiscalYearManagement(new Date('2027-07-20T06:00:00Z'));
    assert.equal(rolledOver.currentFiscalYear, '2084/85');
    assert.equal(rolledOver.previousYearControl.fiscalYear, '2083/84');
    assert.equal(rolledOver.previousYearControl.status, 'CLOSED');
    assert.equal(rolledOver.nextYearControl.fiscalYear, '2085/86');
    assert.equal(rolledOver.nextYearControl.status, 'CLOSED');
    assert.deepEqual(rolledOver.billingFiscalYears.map((y) => y.name), ['2084/85']);
    const rolledCalendar = deriveCalendarFiscalYears({
      baseDate: new Date('2027-07-20T06:00:00Z'),
      billingAccess: afterOpenNext.groupedSettings.fiscalYear.billingAccess,
    });
    assert.deepEqual(
      rolledCalendar.filter((y) => y.status === 'ACTIVE').map((y) => y.name),
      ['2084/85'],
    );
  });

  test('vehicleResourceToBillingVehicle reads smsPhone from metadata and defaults to TQMS owner phone when unchanged', () => {
    const baseResource: VehicleResourceDocument = {
      id: '100',
      resource: { id: 100, resource_name: 'VehicleResource' },
      innerContent: {
        VehicleId: '101',
        VehicleNumber: 'Ba 1 Ja 1234',
        VehicleType: 'Taxi',
        Owners: [{ Name: 'Ram Bahadur', Phone: '9841000001', isDhani: true }],
      },
      externalContent: {},
    };

    const unchanged = vehicleResourceToBillingVehicle(baseResource);
    assert.equal(unchanged.phone, '9841000001');
    assert.equal(unchanged.smsPhone, '9841000001');

    const withMetadataSms: VehicleResourceDocument = {
      ...baseResource,
      innerContent: {
        ...baseResource.innerContent,
        metadata: { smsPhone: '9851223344' },
      },
    };
    const changed = vehicleResourceToBillingVehicle(withMetadataSms);
    assert.equal(changed.phone, '9841000001');
    assert.equal(changed.smsPhone, '9851223344');
  });
});
