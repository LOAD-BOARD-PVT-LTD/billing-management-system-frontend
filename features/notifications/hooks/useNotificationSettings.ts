'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotificationSettings,
  saveNotificationSettings,
  saveSmsProviderConfig,
  saveSmsTemplates,
  type NotificationSettingsDocument,
} from '@/features/notifications/api/notification-settings.api';
import type {
  SmsProviderConfig,
  SmsTemplate,
  SmsTemplatesSettings,
} from '@/features/notifications/types';
import { settingsKeys } from '@/lib/query/query-keys';

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.notificationManagement(),
    queryFn: fetchNotificationSettings,
  });

  const onSuccess = (document: NotificationSettingsDocument) => {
    queryClient.setQueryData(settingsKeys.notificationManagement(), document);
  };

  const saveMutation = useMutation({
    mutationFn: async (settings: SmsTemplatesSettings) => {
      if (!query.data) throw new Error('SMS सेटिङ लोड भएको छैन।');
      return saveNotificationSettings(settings, query.data);
    },
    onSuccess,
  });

  const providerMutation = useMutation({
    mutationFn: async (providerConfig: SmsProviderConfig) => {
      if (!query.data) throw new Error('SMS सेटिङ लोड भएको छैन।');
      return saveSmsProviderConfig(providerConfig, query.data);
    },
    onSuccess,
  });

  const templatesMutation = useMutation({
    mutationFn: async (templates: SmsTemplate[]) => {
      if (!query.data) throw new Error('SMS सेटिङ लोड भएको छैन।');
      return saveSmsTemplates(templates, query.data);
    },
    onSuccess,
  });

  return {
    document: query.data,
    settings: query.data?.settings ?? null,
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending || providerMutation.isPending || templatesMutation.isPending,
    isSavingProvider: providerMutation.isPending,
    isSavingTemplates: templatesMutation.isPending,
    loadError: query.error instanceof Error ? query.error.message : null,
    saveError: saveMutation.error instanceof Error
      ? saveMutation.error.message
      : providerMutation.error instanceof Error
        ? providerMutation.error.message
        : templatesMutation.error instanceof Error
          ? templatesMutation.error.message
          : null,
    providerSaveError: providerMutation.error instanceof Error ? providerMutation.error.message : null,
    templatesSaveError: templatesMutation.error instanceof Error ? templatesMutation.error.message : null,
    reload: () => query.refetch(),
    save: (settings: SmsTemplatesSettings) => saveMutation.mutateAsync(settings),
    saveProviderConfig: (providerConfig: SmsProviderConfig) => providerMutation.mutateAsync(providerConfig),
    saveTemplates: (templates: SmsTemplate[]) => templatesMutation.mutateAsync(templates),
  };
}
