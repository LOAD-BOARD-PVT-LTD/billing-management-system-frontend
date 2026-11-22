import { SmsProviderSettingsControl, SmsTemplatesControl } from '@/features/notifications';

export default function NotificationsRoute() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 py-2">
      <SmsProviderSettingsControl />
      <SmsTemplatesControl />
    </div>
  );
}
