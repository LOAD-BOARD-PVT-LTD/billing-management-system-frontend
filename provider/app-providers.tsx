'use client';

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { OrganizationProvider } from '@/contexts/organization-context';
import { FontasyHimaliProvider } from '@/contexts/fontasy-himali-context';
import type { OrganizationConfig } from '@/constants/organization';
import { createQueryClient } from '@/lib/query/query-client';
import { ThemeProvider } from '@/components/ui/theme-provider';

export function Providers({
  children,
  organization,
  organizationId,
}: {
  children: ReactNode;
  organization?: OrganizationConfig;
  organizationId?: string | null;
}) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <OrganizationProvider organization={organization} organizationId={organizationId}>
      <ThemeProvider>
        <FontasyHimaliProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </QueryClientProvider>
        </FontasyHimaliProvider>
      </ThemeProvider>
    </OrganizationProvider>
  );
}