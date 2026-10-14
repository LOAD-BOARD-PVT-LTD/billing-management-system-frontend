export type DocumentOrientation = 'portrait' | 'landscape';

export type DocumentOptions = {
  orientation: DocumentOrientation;
  copies: number;
  pageFormat?: 'a4' | 'receipt';
  filename?: string;
};

export type CompanyBrandingOptions = {
  name: string;
  officeAddress: string;
  regionalOfficeText: string;
  organizationPurpose: string;
  panNumber?: string;
  registrationNumber?: string;
};
