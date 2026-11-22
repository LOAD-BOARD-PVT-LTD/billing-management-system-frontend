'use client';

import { useCallback } from 'react';

import { EMPTY_BILLING_RULE_CONFIG } from '@/features/billing-rules/model/defaults';
import type {
  BillingRule,
  BillingRuleConfig,
  FeeHead,
} from '@/features/billing-rules/model/types';
import { sortFeeHeadsByDisplayOrder } from '@/features/billing-rules/utils/fee-head-order';
import { useBillingRules } from '@/features/billing-rules/hooks/useBillingRules';

export function useBillingRuleConfig() {
  const { config, setConfig, isLoading, hasLoaded, isSaving, error, load, save, update, remove } = useBillingRules();

  const persist = useCallback(async (nextConfig: BillingRuleConfig) => {
    const saved = await save(nextConfig);
    setConfig(saved);
    return saved;
  }, [save, setConfig]);

  const getFeeHeads = useCallback(() => config.feeHeads, [config.feeHeads]);
  const addFeeHead = useCallback(async (feeHead: FeeHead) => {
    const orderedFeeHeads = sortFeeHeadsByDisplayOrder(config.feeHeads);
    const feeHeadIndex = orderedFeeHeads.findIndex((item) => item.id === feeHead.id);
    const nextFeeHeads = orderedFeeHeads.map((item, index) => ({
      ...(item.id === feeHead.id ? feeHead : item),
      displayOrder: index,
    }));
    if (feeHeadIndex === -1) {
      nextFeeHeads.push({ ...feeHead, displayOrder: nextFeeHeads.length });
    }
    const next = {
      ...config,
      feeHeads: nextFeeHeads,
    };
    return persist(next);
  }, [config, persist]);
  const updateFeeHead = addFeeHead;
  const removeFeeHead = useCallback(async (id: string) => {
    const next = {
      ...config,
      feeHeads: config.feeHeads.map((item) => item.id === id ? { ...item, status: 'INACTIVE' as const } : item),
    };
    return persist(next);
  }, [config, persist]);

  const getFiscalYears = useCallback(() => config.fiscalYears, [config.fiscalYears]);

  const getRules = useCallback(() => config.rules, [config.rules]);
  const addRule = useCallback(async (rule: BillingRule) => {
    const next = {
      ...config,
      rules: [...config.rules.filter((item) => item.id !== rule.id), rule],
    };
    return persist(next);
  }, [config, persist]);
  const updateRule = addRule;
  const removeRule = useCallback(async (id: string) => {
    const next = {
      ...config,
      rules: config.rules.map((rule) => rule.id === id ? { ...rule, status: 'INACTIVE' as const } : rule),
    };
    return persist(next);
  }, [config, persist]);

  return {
    config,
    feeHeads: config.feeHeads,
    fiscalYears: config.fiscalYears,
    rules: config.rules,
    isLoading,
    hasLoaded,
    isSaving,
    error,
    reload: load,
    save: persist,
    reset: useCallback(() => setConfig(EMPTY_BILLING_RULE_CONFIG), [setConfig]),
    getFeeHeads,
    addFeeHead,
    updateFeeHead,
    removeFeeHead,
    getFiscalYears,
    getRules,
    addRule,
    updateRule,
    removeRule,
    update,
    remove,
  };
}
