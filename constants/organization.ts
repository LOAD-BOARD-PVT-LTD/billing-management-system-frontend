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
} as const satisfies OrganizationConfig;