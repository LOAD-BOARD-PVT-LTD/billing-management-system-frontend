'use client';

import { atom } from 'jotai';
import type { BillingRuleResourceDocument } from '@/features/billing-rules/api/billingRuleResource';

/**
 * @deprecated Redundant dual-store atom. Components should consume `useBillingRules()` query config directly.
 */
export const billingRuleResponseAtom = atom<BillingRuleResourceDocument | null>(null);
