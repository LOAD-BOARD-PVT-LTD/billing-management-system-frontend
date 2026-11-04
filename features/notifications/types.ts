export type NotificationChannel = 'SMS' | 'In-app' | 'Email';

export type NotificationStatus = 'Delivered' | 'Pending' | 'Failed' | 'Scheduled';

export type NotificationCategory = 'Billing' | 'Member' | 'Vehicle' | 'System';

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: NotificationCategory;
  content: string;
  channel: NotificationChannel;
  active: boolean;
}

export interface NotificationHistoryItem {
  id: string;
  recipient: string;
  phone: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string;
  provider: string;
}

export interface NotificationAutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  template: string;
}

export interface NotificationManagementSettings {
  templates: NotificationTemplate[];
  automationRules: NotificationAutomationRule[];
}
