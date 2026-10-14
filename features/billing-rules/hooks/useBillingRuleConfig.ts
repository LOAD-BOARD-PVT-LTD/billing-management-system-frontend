'use client';

import { useCallback } from 'react';

import { EMPTY_BILLING_RULE_CONFIG } from '@/features/billing-rules/model/defaults';
import type {
  BillingRule,
  BillingRuleConfig,
  FeeHead,
  FiscalYear,
} from '@/features/billing-rules/model/types';
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
    const next = {
      ...config,
      feeHeads: [...config.feeHeads.filter((item) => item.id !== feeHead.id), feeHead],
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
  const addFiscalYear = useCallback(async (year: FiscalYear) => {
    const next = {
      ...config,
      fiscalYears: [...config.fiscalYears.filter((item) => item.id !== year.id), year],
    };
    return persist(next);
  }, [config, persist]);
  const updateFiscalYear = addFiscalYear;
  const removeFiscalYear = useCallback(async (id: string) => {
    const currentYear = config.fiscalYears.find((year) => year.id === id);
    const fiscalYears = config.fiscalYears.map((item) => item.id === id
      ? { ...item, status: 'INACTIVE' as const, isDefault: false }
      : item);
    const needsDefault = currentYear?.isDefault
      && !fiscalYears.some((year) => year.isDefault && year.status === 'ACTIVE');
    const nextDefaultId = needsDefault ? fiscalYears.find((year) => year.status === 'ACTIVE')?.id : undefined;
    const normalizedYears = nextDefaultId
      ? fiscalYears.map((year) => year.id === nextDefaultId ? { ...year, isDefault: true } : year)
      : fiscalYears;
    const next = {
      ...config,
      fiscalYears: normalizedYears,
    };
    return persist(next);
  }, [config, persist]);

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
    addFiscalYear,
    updateFiscalYear,
    removeFiscalYear,
    getRules,
    addRule,
    updateRule,
    removeRule,
    update,
    remove,
  };
}
