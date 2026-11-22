import type {
  SmsProviderConfig,
  SmsProviderId,
  SmsTemplate,
  SmsTemplatesSettings,
} from '@/features/notifications/types';

export const DEFAULT_SAMAYASMS_BASE_URL = 'https://samayasms.com.np/smsapi/index.php';

export const DEFAULT_SMS_PROVIDER_CONFIG: SmsProviderConfig = {
  enabled: false,
  provider: '',
  apiKey: '',
  apiSecret: '',
  senderId: '',
  baseUrl: '',
  defaultCountryCode: '+977',
  webhookUrl: '',
};

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'PAID',
    name: 'भुक्तानी प्राप्त',
    active: true,
    content: 'तपाईंको सवारी नम्बर {vehicleNumber} को रकम रु {amount} प्राप्त भएको छ।\nधन्यवाद। {organizationName}\nम्याद सकिने मिति: {expiryDate}',
  },
  {
    id: 'PAYMENT REMAINDER',
    name: 'भुक्तानी रिमाइन्डर',
    active: true,
    content: 'नमस्कार, सवारी नम्बर {vehicleNumber} को रु {amount} भुक्तानी बाँकी छ। कृपया {dueDate} भित्र भुक्तानी गर्नुहोस्।\n{organizationName}',
  },
  {
    id: 'URGENT',
    name: 'अत्यावश्यक रिमाइन्डर',
    active: false,
    content: 'अत्यावश्यक सूचना: सवारी नम्बर {vehicleNumber} को भुक्तानी म्याद {dueDate} मा सकिँदैछ। सेवा निरन्तरताका लागि समयमै भुक्तानी गर्नुहोस्।\n{organizationName}',
  },
];

export const DEFAULT_SMS_SETTINGS: SmsTemplatesSettings = {
  ...DEFAULT_SMS_PROVIDER_CONFIG,
  templates: DEFAULT_SMS_TEMPLATES,
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateSmsProviderConfig(
  value: unknown,
  options?: { strict?: boolean },
): SmsProviderConfig {
  const parsed = asRecord(value);
  if (options?.strict && !parsed) {
    throw new Error('SMS प्रदायक सेटिङको ढाँचा अमान्य छ।');
  }
  const record = parsed ?? {};
  const rawProvider = typeof record.provider === 'string' ? record.provider.trim() : '';
  if (options?.strict && rawProvider && rawProvider !== 'samayasms' && rawProvider !== 'http') {
    throw new Error('अमान्य SMS प्रदायक चयन गरिएको छ।');
  }
  const provider: SmsProviderId = rawProvider === 'samayasms' || rawProvider === 'http'
    ? rawProvider
    : '';
  const enabled = typeof record.enabled === 'boolean'
    ? record.enabled
    : DEFAULT_SMS_PROVIDER_CONFIG.enabled;
  const apiKey = typeof record.apiKey === 'string'
    ? record.apiKey.trim()
    : DEFAULT_SMS_PROVIDER_CONFIG.apiKey;
  const apiSecret = typeof record.apiSecret === 'string'
    ? record.apiSecret.trim()
    : DEFAULT_SMS_PROVIDER_CONFIG.apiSecret;
  const senderId = typeof record.senderId === 'string'
    ? record.senderId.trim()
    : DEFAULT_SMS_PROVIDER_CONFIG.senderId;
  const baseUrl = typeof record.baseUrl === 'string'
    ? record.baseUrl.trim()
    : DEFAULT_SMS_PROVIDER_CONFIG.baseUrl;
  const rawCountryCode = typeof record.defaultCountryCode === 'string'
    ? record.defaultCountryCode.trim()
    : '';
  const defaultCountryCode = rawCountryCode || DEFAULT_SMS_PROVIDER_CONFIG.defaultCountryCode;
  const webhookUrl = typeof record.webhookUrl === 'string'
    ? record.webhookUrl.trim()
    : DEFAULT_SMS_PROVIDER_CONFIG.webhookUrl;

  if (options?.strict) {
    if (!/^\+?\d{1,5}$/u.test(defaultCountryCode)) {
      throw new Error('Default Country Code मान्य ढाँचामा हुनुपर्छ (उदाहरण: +977)।');
    }
    if (baseUrl && !isValidHttpUrl(baseUrl)) {
      throw new Error('Base URL मान्य HTTP/HTTPS ठेगाना हुनुपर्छ।');
    }
    if (webhookUrl && !isValidHttpUrl(webhookUrl)) {
      throw new Error('Webhook URL मान्य HTTP/HTTPS ठेगाना हुनुपर्छ।');
    }
    if (enabled) {
      if (!provider) {
        throw new Error('SMS प्रदायक चयन गर्नुहोस्।');
      }
      if (!apiKey) {
        throw new Error('API Key आवश्यक छ।');
      }
      if (provider === 'samayasms' && !senderId) {
        throw new Error('SamayaSMS का लागि Sender ID आवश्यक छ।');
      }
      if (provider === 'http' && !baseUrl) {
        throw new Error('Generic HTTP प्रदायकका लागि Base URL आवश्यक छ।');
      }
    }
  }

  return {
    enabled,
    provider,
    apiKey,
    apiSecret,
    senderId,
    baseUrl,
    defaultCountryCode,
    webhookUrl,
  };
}

function parseTemplate(value: unknown): SmsTemplate {
  const record = asRecord(value);
  if (
    !record
    || typeof record.id !== 'string'
    || typeof record.name !== 'string'
    || typeof record.active !== 'boolean'
    || typeof record.content !== 'string'
  ) {
    throw new Error('SMS टेम्प्लेटको सुरक्षित गरिएको विवरण अमान्य छ।');
  }
  const id = record.id.trim();
  const name = record.name.trim();
  if (!id || !name) {
    throw new Error('हरेक SMS टेम्प्लेटमा पहिचान र नाम आवश्यक छ।');
  }
  if (!record.content.trim()) {
    throw new Error('SMS टेम्प्लेटको सन्देश खाली हुन मिल्दैन।');
  }
  return {
    id,
    name,
    active: record.active,
    content: record.content,
  };
}

export function validateSmsTemplatesSettings(
  value: unknown,
  options?: { strictProvider?: boolean },
): SmsTemplatesSettings {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.templates)) {
    throw new Error('SMS टेम्प्लेट सेटिङको ढाँचा अमान्य छ।');
  }
  if (record.templates.length === 0) {
    throw new Error('कम्तीमा एउटा SMS टेम्प्लेट आवश्यक छ।');
  }
  const templates = record.templates.map(parseTemplate);
  const templateIds = new Set<string>();
  for (const template of templates) {
    if (templateIds.has(template.id)) {
      throw new Error('एउटै SMS टेम्प्लेट पहिचान दोहोरिएको छ।');
    }
    templateIds.add(template.id);
  }
  const providerConfig = validateSmsProviderConfig(record, { strict: options?.strictProvider });
  return {
    ...providerConfig,
    templates,
  };
}
