'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  organizationConfig,
  organizationThemeDefaults,
  type OrganizationConfig,
} from '@/constants/organization';

export interface OrganizationContextValue {
  organizationId: string | null;
  organization: OrganizationConfig;
  setActiveOrganization: (
    organizationId: string | null,
    configuration?: Partial<OrganizationConfig>,
  ) => void;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);
const hexColorPattern = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
const safeLogoUrlPattern = /^(?:\/(?!\/)|https:\/\/)/iu;

type OrganizationThemeState = {
  organizationId: string | null;
  organization: OrganizationConfig;
};

function fallbackConfiguration(organizationId: string | null): OrganizationConfig {
  if (!organizationId) {
    return organizationConfig;
  }
  const fallback: OrganizationConfig = {
    ...organizationConfig,
    organizationId,
    nameNepali: 'सदस्यता शुल्क व्यवस्थापन प्रणाली',
    nameEnglish: 'Membership Billing System',
    logoUrl: undefined,
  };
  return fallback;
}

export function resolveOrganizationConfiguration(
  organizationId: string | null,
  configuration?: Partial<OrganizationConfig>,
): OrganizationThemeState {
  const fallback = fallbackConfiguration(organizationId);
  const input = configuration ?? {};
  const validColor = (value: unknown, defaultValue: string): string => (
    typeof value === 'string' && hexColorPattern.test(value) ? value : defaultValue
  );
  const logoUrl = typeof input.logoUrl === 'string'
    && safeLogoUrlPattern.test(input.logoUrl)
    && !/[\u0000-\u001f"'<>]/u.test(input.logoUrl)
    ? input.logoUrl
    : undefined;
  const themeMode = input.themeMode === 'dark' || input.themeMode === 'system'
    ? input.themeMode
    : organizationThemeDefaults.themeMode;
  const borderRadius = input.borderRadius === 'compact' || input.borderRadius === 'rounded'
    ? input.borderRadius
    : organizationThemeDefaults.borderRadius;

  return {
    organizationId,
    organization: {
      ...fallback,
      ...input,
      organizationId: organizationId ?? undefined,
      nameNepali: typeof input.nameNepali === 'string' && input.nameNepali.trim()
        ? input.nameNepali.trim()
        : fallback.nameNepali,
      nameEnglish: typeof input.nameEnglish === 'string' && input.nameEnglish.trim()
        ? input.nameEnglish.trim()
        : fallback.nameEnglish,
      logoUrl,
      primaryColor: validColor(input.primaryColor, fallback.primaryColor ?? organizationThemeDefaults.primaryColor),
      secondaryColor: validColor(input.secondaryColor, fallback.secondaryColor ?? organizationThemeDefaults.secondaryColor),
      accentColor: validColor(input.accentColor, fallback.accentColor ?? organizationThemeDefaults.accentColor),
      themeMode,
      borderRadius,
      currencySymbol: typeof input.currencySymbol === 'string' && input.currencySymbol.trim()
        ? input.currencySymbol.trim()
        : fallback.currencySymbol,
      featureFlags: {
        generalBilling: input.featureFlags?.generalBilling
          ?? fallback.featureFlags?.generalBilling
          ?? false,
      },
    },
  };
}

export function OrganizationProvider({
  children,
  organization,
  organizationId,
}: {
  children: ReactNode;
  organization?: Partial<OrganizationConfig>;
  organizationId?: string | null;
}) {
  const requestedOrganizationId = organizationId ?? organization?.organizationId ?? null;
  const sourceKey = JSON.stringify([requestedOrganizationId, organization]);
  const [selection, setSelection] = useState<{
    sourceKey: string;
    configuration: OrganizationThemeState;
  } | null>(null);
  const active = selection?.sourceKey === sourceKey
    ? selection.configuration
    : resolveOrganizationConfiguration(requestedOrganizationId, organization);

  const setActiveOrganization = useCallback((
    nextOrganizationId: string | null,
    configuration?: Partial<OrganizationConfig>,
  ) => {
    setSelection({
      sourceKey,
      configuration: resolveOrganizationConfiguration(nextOrganizationId, configuration),
    });
  }, [sourceKey]);

  const value = useMemo(() => ({
    ...active,
    setActiveOrganization,
  }), [active, setActiveOrganization]);

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  return context ?? {
    ...resolveOrganizationConfiguration(null),
    setActiveOrganization: () => {},
  };
}
