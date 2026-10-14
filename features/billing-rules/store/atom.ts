'use client';

import { atom } from 'jotai';
import type { BillingRuleResourceDocument } from '@/features/billing-rules/api/billingRuleResource';

export const billingRuleResponseAtom = atom<BillingRuleResourceDocument | null>(null);