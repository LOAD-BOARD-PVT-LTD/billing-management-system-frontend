'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { organizationConfig, type OrganizationConfig } from '@/constants/organization';

export interface OrganizationContextValue {
  organizationId: string | null;
  organization: OrganizationConfig;
}

const defaultOrganizationContext: OrganizationContextValue = {
  organizationId: null,
  organization: organizationConfig,
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;

function validateOrganizationTheme(organization: OrganizationConfig): void {
  if (!hexColorPattern.test(organization.primaryColor)) {
    throw new Error('Organization primaryColor must be a three- or six-digit hex color.');
  }
  if (organization.secondaryColor && !hexColorPattern.test(organization.secondaryColor)) {
    throw new Error('Organization secondaryColor must be a three- or six-digit hex color.');
  }
}

export function OrganizationProvider({
  children,
  organization = organizationConfig,
  organizationId = organization.organizationId ?? null,
}: {
  children: ReactNode;
  organization?: OrganizationConfig;
  organizationId?: string | null;
}) {
  validateOrganizationTheme(organization);
  const value = useMemo(
    () => ({ organizationId, organization }),
    [organizationId, organization],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  return context ?? defaultOrganizationContext;
}
