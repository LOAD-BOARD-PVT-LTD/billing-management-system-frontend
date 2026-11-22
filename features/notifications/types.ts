export type SmsProviderId = '' | 'samayasms' | 'http';

export interface SmsProviderConfig {
  enabled: boolean;
  provider: SmsProviderId;
  apiKey: string;
  apiSecret: string;
  senderId: string;
  baseUrl: string;
  defaultCountryCode: string;
  webhookUrl: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  active: boolean;
  content: string;
}

export interface SmsTemplatesSettings extends SmsProviderConfig {
  templates: SmsTemplate[];
}
