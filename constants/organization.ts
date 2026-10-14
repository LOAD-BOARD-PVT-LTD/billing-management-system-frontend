export const organizationConfig = {
  nameNepali: 'नारायणी संघ',
  nameEnglish: 'Narayani Test Billing',
  primaryColor: '#4F46E5',
  currencySymbol: 'Rs.',
  fileUploadSettings: {
    meetingDocuments: {
      maxFileSizeMb: 10,
      maxFilesPerUpload: 5,
      maxFilesTotal: 5,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    },
  },
} as const;

export type OrganizationConfig = typeof organizationConfig;