'use client';

import { useState } from 'react';
import { Car, FileText } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/contexts/organization-context';
import { BillingWorkspace, GeneralBillingWorkspace } from '@/features/billing';
import { useTranslations } from '@/utils/translations';

export default function BillingNewPage() {
  const { organization } = useOrganization();
  const { t } = useTranslations();
  const [billingMode, setBillingMode] = useState<'membership' | 'general'>('membership');
  const generalBillingEnabled = organization.featureFlags?.generalBilling === true;

  return (
    <div className="space-y-3">
      {generalBillingEnabled ? (
        <Tabs
          value={billingMode}
          onValueChange={(value) => setBillingMode(value as 'membership' | 'general')}
        >
          <TabsList aria-label="बिलिङ प्रकार" className="grid h-auto w-full grid-cols-2 sm:inline-grid sm:w-auto">
            <TabsTrigger value="membership" className="gap-2">
              <Car aria-hidden="true" className="size-4" />
              {t('navigation.membershipBilling')}
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <FileText aria-hidden="true" className="size-4" />
              {t('navigation.generalBilling')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      ) : null}
      {billingMode === 'general' && generalBillingEnabled
        ? <GeneralBillingWorkspace />
        : <BillingWorkspace />}
    </div>
  );
}
