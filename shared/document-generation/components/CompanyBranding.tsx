import Image from 'next/image';
import type { CompanyBrandingOptions } from '../types/document.types';

export const DEFAULT_COMPANY_BRANDING: CompanyBrandingOptions = {
  name: 'नारायणी यातायात व्यवसायी संघ',
  officeAddress: 'मुख्य कार्यालय, हेटौंडा - ४, परिजातपथ',
  regionalOfficeText: '(क्षेत्रीय तथा शाखा कार्यालयहरू: चितवन, परासी, काठमाडौं, पोखरा)',
  organizationPurpose: 'सदस्यता / सदस्यता नवीकरण / हितकोष शुल्क',
};

export function CompanyBranding({ branding }: { branding: CompanyBrandingOptions }) {
  return (
    <div className="document-branding">
      <div className="document-logo">
        <Image
          src="/narayani-logo.jpeg"
          alt={branding.name}
          width={80}
          height={80}
          priority
        />
      </div>
      <div className="document-organization">
        <h1>{branding.name}</h1>
        <p>{branding.officeAddress}</p>
        <p>{branding.regionalOfficeText}</p>
        <p className="document-purpose">{branding.organizationPurpose}</p>
        {branding.registrationNumber ? <p>दर्ता नं. {branding.registrationNumber}</p> : null}
        {branding.panNumber ? <p>PAN नं. {branding.panNumber}</p> : null}
        <h2>नगदी रसिद</h2>
      </div>
    </div>
  );
}
