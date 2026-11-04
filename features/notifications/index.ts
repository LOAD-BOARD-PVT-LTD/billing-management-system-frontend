export { NotificationDashboard } from './components/NotificationDashboard';
export {
  DEFAULT_NOTIFICATION_SETTINGS,
  fetchNotificationSettings,
  saveNotificationSettings,
  validateNotificationSettings,
} from './api/notification-settings.api';
export { useNotificationSettings } from './hooks/useNotificationSettings';
export type {
  NotificationAutomationRule,
  NotificationCategory,
  NotificationChannel,
  NotificationHistoryItem,
  NotificationManagementSettings,
  NotificationRecord,
  NotificationStatus,
  NotificationTemplate,
} from './types';
export type { NotificationSettingsDocument } from './api/notification-settings.api';
