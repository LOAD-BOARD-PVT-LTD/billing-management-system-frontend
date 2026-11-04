'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotificationSettings,
  saveNotificationSettings,
  type NotificationSettingsDocument,
} from '@/features/notifications/api/notification-settings.api';
import type { NotificationManagementSettings } from '@/features/notifications/types';
import { settingsKeys } from '@/lib/query/query-keys';

export function useNotificationSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: settingsKeys.notificationManagement(),
    queryFn: fetchNotificationSettings,
  });
  const saveMutation = useMutation({
    mutationFn: async (settings: NotificationManagementSettings) => {
      if (!query.data) throw new Error('सूचना सेटिङ लोड भएको छैन।');
      return saveNotificationSettings(settings, query.data);
    },
    onSuccess: (document: NotificationSettingsDocument) => {
      queryClient.setQueryData(settingsKeys.notificationManagement(), document);
    },
  });

  return {
    document: query.data,
    settings: query.data?.settings ?? null,
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending,
    loadError: query.error instanceof Error ? query.error.message : null,
    saveError: saveMutation.error instanceof Error ? saveMutation.error.message : null,
    reload: () => query.refetch(),
    save: (settings: NotificationManagementSettings) => saveMutation.mutateAsync(settings),
  };
}
