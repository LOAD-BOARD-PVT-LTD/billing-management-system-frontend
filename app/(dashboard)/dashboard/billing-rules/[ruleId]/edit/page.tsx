'use client';

import { useParams } from 'next/navigation';

import { BillingRulesPage } from '@/features/billing-rules/components/BillingRulesPage';

export default function BillingRuleEditPage() {
  const { ruleId } = useParams<{ ruleId: string }>();

  return <BillingRulesPage editRuleId={ruleId} />;
}
