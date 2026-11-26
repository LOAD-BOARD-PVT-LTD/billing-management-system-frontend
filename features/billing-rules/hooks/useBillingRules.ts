'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { billingRulesApi } from '@/features/billing-rules/api/billingRulesApi';
import { EMPTY_BILLING_RULE_CONFIG } from '@/features/billing-rules/model/defaults';
import type { BillingRuleConfig } from '@/features/billing-rules/model/types';
import type { BillingRuleResourceDocument } from '@/features/billing-rules/api/billingRuleResource';
import { billingRulesKeys } from '@/lib/query/query-keys';

export function useBillingRules() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: billingRulesKeys.config(),
    queryFn: billingRulesApi.list,
  });

  const setConfig = useCallback((nextConfig: BillingRuleConfig) => {
    const current = queryClient.getQueryData<BillingRuleResourceDocument>(billingRulesKeys.config());
    const nextDocument: BillingRuleResourceDocument = {
      resourceId: current?.resourceId ?? null,
      config: nextConfig,
    };
    queryClient.setQueryData<BillingRuleResourceDocument>(billingRulesKeys.config(), nextDocument);
  }, [queryClient]);

  const activeSaveRef = useRef<Promise<BillingRuleConfig> | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (nextConfig: BillingRuleConfig) => {
      const current = queryClient.getQueryData<BillingRuleResourceDocument>(billingRulesKeys.config());
      return billingRulesApi.save(nextConfig, current?.config ?? EMPTY_BILLING_RULE_CONFIG);
    },
    onSuccess: (savedDocument) => {
      queryClient.setQueryData(billingRulesKeys.config(), savedDocument);
      void queryClient.invalidateQueries({ queryKey: billingRulesKeys.config() });
    },
  });

  const runSingleFlightSave = useCallback((nextConfig: BillingRuleConfig): Promise<BillingRuleConfig> => {
    if (activeSaveRef.current) {
      return activeSaveRef.current;
    }
    const promise = saveMutation
      .mutateAsync(nextConfig)
      .then((saved) => saved.config)
      .finally(() => {
        if (activeSaveRef.current === promise) {
          activeSaveRef.current = null;
        }
      });
    activeSaveRef.current = promise;
    return promise;
  }, [saveMutation]);

  const load = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: billingRulesKeys.config() });
  }, [queryClient]);

  return {
    config: query.data?.config ?? EMPTY_BILLING_RULE_CONFIG,
    resourceId: query.data?.resourceId ?? null,
    setConfig,
    isLoading: query.isLoading,
    hasLoaded: query.isSuccess,
    isSaving: saveMutation.isPending,
    error: query.error instanceof Error ? query.error.message : saveMutation.error instanceof Error ? saveMutation.error.message : null,
    load,
    save: runSingleFlightSave,
    update: ({ config: nextConfig }: { id: string; config: BillingRuleConfig }) => runSingleFlightSave(nextConfig),
    remove: async (id: string) => {
      const current = queryClient.getQueryData<BillingRuleResourceDocument>(billingRulesKeys.config());
      if (!current) throw new Error('Billing rule configuration is unavailable.');
      const nextConfig = {
        ...current.config,
        rules: current.config.rules.map((rule) => rule.id === id ? { ...rule, status: 'INACTIVE' as const } : rule),
      };
      await runSingleFlightSave(nextConfig);
    },
  };
}
