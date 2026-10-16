export interface OrganizationConfig {
  organizationId?: string;
  nameNepali: string;
  nameEnglish: string;
  primaryColor: string;
  secondaryColor?: string;
  borderRadius?: 'compact' | 'comfortable' | 'rounded';
  currencySymbol: string;
}

export const organizationConfig = {
  nameNepali: 'नारायणी यातायात व्यवसायी संघ',
  nameEnglish: 'Narayani Test Billing',
  primaryColor: '#4F46E5',
  secondaryColor: '#E0E7FF',
  borderRadius: 'comfortable',
  currencySymbol: 'Rs.',
} as const satisfies OrganizationConfig;