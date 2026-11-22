import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SMS_PROVIDER_CONFIG,
  DEFAULT_SMS_SETTINGS,
  fetchNotificationSettings,
  saveNotificationSettings,
  saveSmsProviderConfig,
  saveSmsTemplates,
  validateSmsProviderConfig,
  validateSmsTemplatesSettings,
} from '@/features/notifications/api/notification-settings.api';
import { apiClient } from '@/lib/api/client';

describe('SMS Settings & Templates', () => {
  const originalGet = apiClient.get;
  const originalPut = apiClient.put;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.put = originalPut;
  });

  test('validateSmsTemplatesSettings accepts default templates and strips extra legacy fields', () => {
    assert.deepEqual(
      validateSmsTemplatesSettings(DEFAULT_SMS_SETTINGS),
      DEFAULT_SMS_SETTINGS,
    );

    const withExtraFields = {
      templates: DEFAULT_SMS_SETTINGS.templates.map((template) => ({
        ...template,
        category: 'Billing',
        channel: 'SMS',
      })),
    };
    assert.deepEqual(
      validateSmsTemplatesSettings(withExtraFields),
      DEFAULT_SMS_SETTINGS,
    );
  });

  test('validateSmsTemplatesSettings rejects duplicate IDs, empty content, and empty template lists', () => {
    assert.throws(
      () => validateSmsTemplatesSettings({
        templates: [
          ...DEFAULT_SMS_SETTINGS.templates,
          { ...DEFAULT_SMS_SETTINGS.templates[0], name: 'अर्को टेम्प्लेट' },
        ],
      }),
      /टेम्प्लेट पहिचान दोहोरिएको/u,
    );

    assert.throws(
      () => validateSmsTemplatesSettings({
        templates: [{ ...DEFAULT_SMS_SETTINGS.templates[0], content: '   ' }],
      }),
      /सन्देश खाली हुन मिल्दैन/u,
    );

    assert.throws(
      () => validateSmsTemplatesSettings({ templates: [] }),
      /कम्तीमा एउटा SMS टेम्प्लेट/u,
    );
  });

  test('validateSmsProviderConfig enforces enabled requirements and URL/country code formats while allowing partial disabled drafts', () => {
    // Partial config allowed when disabled
    const partialDisabled = validateSmsProviderConfig(
      {
        enabled: false,
        provider: '',
        apiKey: '',
        apiSecret: '',
        senderId: ' Bi_Alert ',
        baseUrl: 'https://samayasms.com.np/smsapi/index.php',
        defaultCountryCode: '',
        webhookUrl: '',
      },
      { strict: true },
    );
    assert.equal(partialDisabled.enabled, false);
    assert.equal(partialDisabled.senderId, 'Bi_Alert');
    assert.equal(partialDisabled.defaultCountryCode, '+977');

    // Enabled requires provider, apiKey, and provider-specific senderId / baseUrl
    assert.throws(
      () => validateSmsProviderConfig({ ...DEFAULT_SMS_PROVIDER_CONFIG, enabled: true }, { strict: true }),
      /SMS प्रदायक चयन गर्नुहोस्/u,
    );
    assert.throws(
      () => validateSmsProviderConfig({ ...DEFAULT_SMS_PROVIDER_CONFIG, enabled: true, provider: 'samayasms' }, { strict: true }),
      /API Key आवश्यक छ/u,
    );
    assert.throws(
      () => validateSmsProviderConfig({
        ...DEFAULT_SMS_PROVIDER_CONFIG,
        enabled: true,
        provider: 'samayasms',
        apiKey: 'secret-key',
      }, { strict: true }),
      /Sender ID आवश्यक छ/u,
    );
    assert.throws(
      () => validateSmsProviderConfig({
        ...DEFAULT_SMS_PROVIDER_CONFIG,
        enabled: true,
        provider: 'http',
        apiKey: 'secret-key',
      }, { strict: true }),
      /Base URL आवश्यक छ/u,
    );

    // Invalid URLs and country code rejected in strict mode
    assert.throws(
      () => validateSmsProviderConfig({
        ...DEFAULT_SMS_PROVIDER_CONFIG,
        baseUrl: 'not-a-url',
      }, { strict: true }),
      /Base URL मान्य/u,
    );
    assert.throws(
      () => validateSmsProviderConfig({
        ...DEFAULT_SMS_PROVIDER_CONFIG,
        webhookUrl: 'ftp://example.com',
      }, { strict: true }),
      /Webhook URL मान्य/u,
    );
    assert.throws(
      () => validateSmsProviderConfig({
        ...DEFAULT_SMS_PROVIDER_CONFIG,
        defaultCountryCode: 'abc',
      }, { strict: true }),
      /Default Country Code मान्य/u,
    );

    // Valid SamayaSMS & HTTP configurations pass
    const validSamaya = validateSmsProviderConfig({
      enabled: true,
      provider: 'samayasms',
      apiKey: ' my-key ',
      apiSecret: ' my-secret ',
      senderId: ' Bi_Alert ',
      baseUrl: 'https://samayasms.com.np/smsapi/index.php',
      defaultCountryCode: '+977',
      webhookUrl: 'https://hooks.example.com/sms',
    }, { strict: true });
    assert.deepEqual(validSamaya, {
      enabled: true,
      provider: 'samayasms',
      apiKey: 'my-key',
      apiSecret: 'my-secret',
      senderId: 'Bi_Alert',
      baseUrl: 'https://samayasms.com.np/smsapi/index.php',
      defaultCountryCode: '+977',
      webhookUrl: 'https://hooks.example.com/sms',
    });
  });

  test('fetchNotificationSettings reads notifications.sms.templates from SettingResource/1 and fills provider defaults', async () => {
    const serverSetting = {
      id: 1,
      resource_name: 'SettingResource',
      inner_content: {
        schemaVersion: 1,
        integrations: {
          tqms: { SanghBranch: 'Loadboard sthaniya' },
        },
        fiscalYear: {
          selector: { yearsBack: 4, yearsForward: 1, archivedYears: [] },
          activeFiscalYears: ['2083/84'],
        },
        billing: {
          vat: { enabled: true, rate: 13, billingEntityIds: ['1'] },
          arrears: {
            monthlyPaid: { enabled: true, fiscalYear: '2082/83', billingRuleId: '5' },
            paidExpired: { enabled: true, billingRuleId: '5' },
          },
          linkedFeeRules: {
            enabled: true,
            rules: [
              {
                id: 'f72c97c7-ddd4-4d35-bbdd-86e4746e57db',
                active: true,
                fiscalYear: '2082/83',
                linkedFeeHeadId: '21',
                sourceFeeHeadId: '3',
                oncePerFiscalYear: true,
              },
            ],
          },
        },
        notifications: {
          sms: {
            templates: [
              {
                id: 'PAID',
                name: 'भुक्तानी प्राप्त',
                active: true,
                content: 'Test gariyeko template तपाईंको सवारी नम्बर {vehicleNumber} को रकम रु {amount} प्राप्त भएको छ।',
              },
              { id: 'URGENT', name: 'अत्यावश्यक रिमाइन्डर', active: false, content: 'म्याद {dueDate} मा सकिँदैछ।' },
            ],
          },
        },
        insurance: {
          eligibility: { enabled: false, ruleIds: [], minPaidRules: 1 },
        },
        receipts: {
          cancellation: { enabled: false, hours: 24 },
        },
        vehicleManagement: {
          displacedTagging: { enabled: true },
        },
      },
      external_content: null,
    };

    apiClient.get = async <T>(): Promise<T> => ([serverSetting] as T);
    const doc = await fetchNotificationSettings();

    assert.equal(doc.resourceId, '1');
    assert.deepEqual(doc.settings, {
      ...DEFAULT_SMS_PROVIDER_CONFIG,
      templates: [
        {
          id: 'PAID',
          name: 'भुक्तानी प्राप्त',
          active: true,
          content: 'Test gariyeko template तपाईंको सवारी नम्बर {vehicleNumber} को रकम रु {amount} प्राप्त भएको छ।',
        },
        { id: 'URGENT', name: 'अत्यावश्यक रिमाइन्डर', active: false, content: 'म्याद {dueDate} मा सकिँदैछ।' },
      ],
    });
  });

  test('saveNotificationSettings, saveSmsProviderConfig, and saveSmsTemplates preserve sibling sections and each other', async () => {
    let existingResource = {
      id: 1,
      resource_name: 'SettingResource',
      inner_content: {
        schemaVersion: 1,
        integrations: {
          tqms: { SanghBranch: 'Loadboard sthaniya' },
        },
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
          linkedFeeRules: {
            enabled: true,
            rules: [
              {
                id: 'f72c97c7-ddd4-4d35-bbdd-86e4746e57db',
                active: true,
                fiscalYear: '2082/83',
                linkedFeeHeadId: '21',
                sourceFeeHeadId: '3',
                oncePerFiscalYear: true,
              },
            ],
          },
        },
        notifications: {
          sms: {
            templates: DEFAULT_SMS_SETTINGS.templates,
          },
        },
        insurance: {
          eligibility: { enabled: true, ruleIds: ['rule-9'], minPaidRules: 1 },
        },
        receipts: {
          cancellation: { enabled: true, hours: 48 },
        },
        vehicleManagement: {
          displacedTagging: { enabled: false },
        },
      } as Record<string, unknown>,
      external_content: null,
    };

    let putPath = '';
    let putBody: Record<string, unknown> | undefined;
    apiClient.get = async <T>(): Promise<T> => ([existingResource] as T);
    apiClient.put = async <T>(path: string, body?: unknown): Promise<T> => {
      putPath = path;
      putBody = body as Record<string, unknown>;
      existingResource = {
        ...existingResource,
        inner_content: putBody.inner_content as Record<string, unknown>,
      };
      return undefined as T;
    };

    // 1. Save SMS provider config independently -> preserves existing templates & sibling sections
    const providerSaved = await saveSmsProviderConfig(
      {
        enabled: true,
        provider: 'samayasms',
        apiKey: 'api-key-123',
        apiSecret: 'api-secret-456',
        senderId: 'Bi_Alert',
        baseUrl: 'https://samayasms.com.np/smsapi/index.php',
        defaultCountryCode: '+977',
        webhookUrl: 'https://example.com/webhook',
      },
      { resourceId: '1', settings: DEFAULT_SMS_SETTINGS },
    );

    assert.equal(putPath, 'update/SettingResource/1');
    assert.equal(putBody?.id, 1);
    assert.equal(typeof putBody?.id, 'number');
    assert.deepEqual(providerSaved.settings.templates, DEFAULT_SMS_SETTINGS.templates);
    assert.equal(providerSaved.settings.enabled, true);
    assert.equal(providerSaved.settings.senderId, 'Bi_Alert');

    const contentAfterProvider = putBody?.inner_content as Record<string, unknown>;
    assert.deepEqual(contentAfterProvider.billing, existingResource.inner_content.billing);
    assert.deepEqual(contentAfterProvider.insurance, existingResource.inner_content.insurance);
    assert.deepEqual(contentAfterProvider.receipts, existingResource.inner_content.receipts);
    assert.deepEqual(contentAfterProvider.vehicleManagement, existingResource.inner_content.vehicleManagement);

    // 2. Save templates independently -> preserves saved provider config & sibling sections
    const nextTemplates = DEFAULT_SMS_SETTINGS.templates.map((template) => (
      template.id === 'URGENT' ? { ...template, active: true, content: 'अद्यावधिक सन्देश {vehicleNumber}' } : template
    ));
    const templatesSaved = await saveSmsTemplates(nextTemplates, providerSaved);
    assert.equal(templatesSaved.settings.enabled, true);
    assert.equal(templatesSaved.settings.provider, 'samayasms');
    assert.equal(templatesSaved.settings.apiKey, 'api-key-123');
    assert.equal(templatesSaved.settings.senderId, 'Bi_Alert');
    assert.deepEqual(templatesSaved.settings.templates, nextTemplates);

    // 3. Full saveNotificationSettings writes full notifications.sms structure
    const nextFull = {
      ...DEFAULT_SMS_PROVIDER_CONFIG,
      enabled: true,
      provider: 'samayasms' as const,
      apiKey: 'key-2',
      senderId: 'Bi_Alert',
      templates: nextTemplates,
    };
    const saved = await saveNotificationSettings(nextFull, templatesSaved);
    assert.equal(saved.resourceId, '1');
    assert.deepEqual(saved.settings, nextFull);

    const content = putBody?.inner_content as Record<string, unknown>;
    assert.deepEqual((content.integrations as Record<string, unknown>).tqms, { SanghBranch: 'Loadboard sthaniya' });
    assert.deepEqual(content.fiscalYear, {
      selector: { yearsBack: 4, yearsForward: 1, archivedYears: [] },
      billingAccess: { previousYear: null, nextYear: null },
    });
    assert.deepEqual(content.notifications, { sms: nextFull });
  });
});
