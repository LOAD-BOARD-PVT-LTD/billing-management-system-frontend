export interface OrganizationConfig {
  organizationId?: string;
  nameNepali: string;
  nameEnglish: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  themeMode?: 'light' | 'dark' | 'system';
  borderRadius?: 'compact' | 'comfortable' | 'rounded';
  currencySymbol: string;
  featureFlags?: {
    generalBilling?: boolean;
  };
}

export const organizationThemeDefaults = {
  primaryColor: '#315D78',
  secondaryColor: '#64748B',
  accentColor: '#0F766E',
  themeMode: 'light',
  borderRadius: 'comfortable',
} as const;

export const organizationConfig = {
  nameNepali: 'नारायणी यातायात व्यवसायी संघ',
  nameEnglish: 'Narayani Internal Billing',
  ...organizationThemeDefaults,
  currencySymbol: 'Rs.',
  featureFlags: {
    generalBilling: process.env.NEXT_PUBLIC_ENABLE_GENERAL_BILLING === 'true',
  },
} as const satisfies OrganizationConfig;