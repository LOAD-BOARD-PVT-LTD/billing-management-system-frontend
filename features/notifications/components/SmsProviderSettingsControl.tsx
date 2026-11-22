'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  MessageCircleMore,
  Save,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  DEFAULT_SAMAYASMS_BASE_URL,
  DEFAULT_SMS_PROVIDER_CONFIG,
  validateSmsProviderConfig,
} from '@/features/notifications/api/notification-settings.api';
import { useNotificationSettings } from '@/features/notifications/hooks/useNotificationSettings';
import type {
  SmsProviderConfig,
  SmsProviderId,
} from '@/features/notifications/types';

function pickProviderConfig(
  value?: Partial<SmsProviderConfig> | null,
): SmsProviderConfig {
  return {
    enabled: value?.enabled ?? DEFAULT_SMS_PROVIDER_CONFIG.enabled,
    provider: value?.provider ?? DEFAULT_SMS_PROVIDER_CONFIG.provider,
    apiKey: value?.apiKey ?? DEFAULT_SMS_PROVIDER_CONFIG.apiKey,
    apiSecret: value?.apiSecret ?? DEFAULT_SMS_PROVIDER_CONFIG.apiSecret,
    senderId: value?.senderId ?? DEFAULT_SMS_PROVIDER_CONFIG.senderId,
    baseUrl: value?.baseUrl ?? DEFAULT_SMS_PROVIDER_CONFIG.baseUrl,
    defaultCountryCode: value?.defaultCountryCode ?? DEFAULT_SMS_PROVIDER_CONFIG.defaultCountryCode,
    webhookUrl: value?.webhookUrl ?? DEFAULT_SMS_PROVIDER_CONFIG.webhookUrl,
  };
}

const PROVIDER_HINTS: Record<Exclude<SmsProviderId, ''>, string> = {
  samayasms: 'SamayaSMS मा API Key र Sender ID आवश्यक छ। Base URL खाली छोड्न सकिन्छ।',
  http: 'Generic HTTP प्रदायकका लागि API Key र Base URL आवश्यक छ।',
};

interface SecretFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  disabled: boolean;
  placeholder?: string;
  onToggleVisibility: () => void;
  onChange: (value: string) => void;
}

function SecretField({
  id,
  label,
  value,
  visible,
  disabled,
  placeholder,
  onToggleVisibility,
  onChange,
}: SecretFieldProps) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleVisibility}
          aria-label={visible ? `${label} लुकाउनुहोस्` : `${label} देखाउनुहोस्`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export function SmsProviderSettingsControl() {
  const { toast } = useToast();
  const notificationSettings = useNotificationSettings();
  const [draft, setDraft] = useState<SmsProviderConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const savedConfig = useMemo(
    () => pickProviderConfig(notificationSettings.settings),
    [notificationSettings.settings],
  );
  const form = draft ?? savedConfig;
  const isDirty = useMemo(
    () => draft !== null && JSON.stringify(draft) !== JSON.stringify(savedConfig),
    [draft, savedConfig],
  );
  const isDisabled = notificationSettings.isLoading
    || Boolean(notificationSettings.loadError)
    || notificationSettings.isSavingProvider;

  const updateForm = (
    updater: (current: SmsProviderConfig) => SmsProviderConfig,
  ) => {
    setValidationError(null);
    setTestNotice(null);
    setDraft((current) => updater(current ?? savedConfig));
  };

  const handleProviderChange = (value: string) => {
    const provider = value as SmsProviderId;
    updateForm((current) => ({
      ...current,
      provider,
      baseUrl: provider === 'samayasms' && !current.baseUrl.trim()
        ? DEFAULT_SAMAYASMS_BASE_URL
        : current.baseUrl,
    }));
  };

  const handleSendTest = () => {
    setValidationError(null);
    setTestNotice(null);
    const cleanedPhone = testPhone.replace(/[\s()-]/gu, '').trim();
    if (!/^\+?\d{7,15}$/u.test(cleanedPhone)) {
      setValidationError('परीक्षण SMS पठाउन मान्य मोबाइल नम्बर लेख्नुहोस्।');
      return;
    }

    try {
      validateSmsProviderConfig({ ...form, enabled: true }, { strict: true });
    } catch (failure) {
      setValidationError(
        failure instanceof Error ? failure.message : 'SMS प्रदायक विवरण अपूर्ण छ।',
      );
      return;
    }

    const message = 'परीक्षण SMS पठाउने backend API हाल उपलब्ध छैन। प्रदायक सेटिङ सुरक्षित गरी backend API जडान भएपछि परीक्षण पठाउन सकिनेछ।';
    setTestNotice(message);
    toast({
      title: 'परीक्षण SMS API उपलब्ध छैन',
      description: message,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setTestNotice(null);

    let validated: SmsProviderConfig;
    try {
      validated = validateSmsProviderConfig(form, { strict: true });
    } catch (failure) {
      setValidationError(
        failure instanceof Error ? failure.message : 'SMS सेटिङ मान्य छैन।',
      );
      return;
    }

    try {
      await notificationSettings.saveProviderConfig(validated);
      setDraft(null);
      toast({ title: 'SMS सेटिङ सुरक्षित भयो।' });
    } catch (failure) {
      toast({
        title: 'SMS सेटिङ सुरक्षित गर्न सकिएन।',
        description: failure instanceof Error ? failure.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border-border/80 bg-card shadow-sm">
      <header className="flex items-start gap-3 border-b border-border/70 px-5 py-4 sm:px-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <MessageCircleMore className="size-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">SMS सेटिङ्स</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            SMS प्रदायक र परीक्षण कन्फिगर गर्नुहोस्
          </p>
        </div>
      </header>

      {notificationSettings.loadError ? (
        <div
          role="alert"
          className="m-5 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive sm:mx-6"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{notificationSettings.loadError}</span>
          <Button
            type="button"
            size="xs"
            variant="link"
            className="h-auto shrink-0 p-0"
            onClick={() => void notificationSettings.reload()}
          >
            पुनः प्रयास
          </Button>
        </div>
      ) : null}

      {notificationSettings.isLoading ? (
        <p role="status" className="px-6 py-8 text-center text-xs text-muted-foreground">
          SMS प्रदायक सेटिङ लोड हुँदैछ...
        </p>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">SMS सेटिङ्स</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.enabled}
                aria-label="SMS सेटिङ्स सक्रिय गर्नुहोस्"
                disabled={isDisabled}
                onClick={() => updateForm((current) => ({ ...current, enabled: !current.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  form.enabled ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-5 rounded-full bg-background shadow-sm transition-transform ${
                    form.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start sm:gap-4">
              <label htmlFor="sms-provider-select" className="text-sm font-medium text-foreground sm:pt-2.5">
                SMS प्रदायक
              </label>
              <div>
                <Select
                  value={form.provider}
                  onValueChange={handleProviderChange}
                  disabled={isDisabled}
                >
                  <SelectTrigger id="sms-provider-select" aria-label="SMS प्रदायक">
                    <SelectValue placeholder="— छान्नुहोस् —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="samayasms">SamayaSMS</SelectItem>
                    <SelectItem value="http">Generic HTTP (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {form.provider ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {PROVIDER_HINTS[form.provider]}
                  </p>
                ) : null}
              </div>
            </div>

            <SecretField
              id="sms-api-key"
              label="API Key"
              value={form.apiKey}
              visible={showApiKey}
              disabled={isDisabled}
              placeholder="••••••••"
              onToggleVisibility={() => setShowApiKey((visible) => !visible)}
              onChange={(value) => updateForm((current) => ({ ...current, apiKey: value }))}
            />

            <SecretField
              id="sms-api-secret"
              label="API Secret"
              value={form.apiSecret}
              visible={showApiSecret}
              disabled={isDisabled}
              onToggleVisibility={() => setShowApiSecret((visible) => !visible)}
              onChange={(value) => updateForm((current) => ({ ...current, apiSecret: value }))}
            />

            <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="sms-sender-id" className="text-sm font-medium text-foreground">
                Sender ID
              </label>
              <Input
                id="sms-sender-id"
                value={form.senderId}
                disabled={isDisabled}
                placeholder="Bi_Alert"
                onChange={(event) => updateForm((current) => ({ ...current, senderId: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="sms-base-url" className="text-sm font-medium text-foreground">
                Base URL
              </label>
              <Input
                id="sms-base-url"
                type="url"
                value={form.baseUrl}
                disabled={isDisabled}
                placeholder={DEFAULT_SAMAYASMS_BASE_URL}
                onChange={(event) => updateForm((current) => ({ ...current, baseUrl: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="sms-country-code" className="text-sm font-medium text-foreground">
                Default Country Code
              </label>
              <Input
                id="sms-country-code"
                value={form.defaultCountryCode}
                disabled={isDisabled}
                placeholder="+977"
                onChange={(event) => updateForm((current) => ({ ...current, defaultCountryCode: event.target.value }))}
              />
            </div>

            <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
              <label htmlFor="sms-webhook-url" className="text-sm font-medium text-foreground">
                Webhook URL
              </label>
              <Input
                id="sms-webhook-url"
                type="url"
                value={form.webhookUrl}
                disabled={isDisabled}
                placeholder="https://..."
                onChange={(event) => updateForm((current) => ({ ...current, webhookUrl: event.target.value }))}
              />
            </div>

            <div className="border-t border-border/60 pt-4">
              <div className="grid gap-1.5 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
                <label htmlFor="sms-test-phone" className="text-sm font-medium text-foreground">
                  परीक्षण SMS
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="sms-test-phone"
                    type="tel"
                    value={testPhone}
                    disabled={isDisabled}
                    placeholder="परीक्षणका लागि मोबाइल नम्बर"
                    onChange={(event) => {
                      setTestPhone(event.target.value);
                      setValidationError(null);
                      setTestNotice(null);
                    }}
                    className="min-w-0 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDisabled}
                    onClick={handleSendTest}
                    className="shrink-0 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Send className="mr-1.5 size-4" aria-hidden="true" />
                    परीक्षण पठाउनुहोस्
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-5 py-4 sm:px-6">
            <div className="min-h-4 flex-1 text-xs">
              {validationError || notificationSettings.providerSaveError ? (
                <p role="alert" className="text-destructive">
                  {validationError ?? notificationSettings.providerSaveError}
                </p>
              ) : testNotice ? (
                <p role="status" className="text-muted-foreground">
                  {testNotice}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              loading={notificationSettings.isSavingProvider}
              disabled={!isDirty || isDisabled}
            >
              <Save className="mr-1.5 size-4" aria-hidden="true" />
              सेभ गर्नुहोस्
            </Button>
          </footer>
        </form>
      )}
    </Card>
  );
}
