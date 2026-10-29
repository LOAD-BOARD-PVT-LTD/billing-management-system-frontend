import { Providers } from '@/provider/app-providers';
import { organizationConfig } from '@/constants/organization';

import '@fontsource/noto-sans-devanagari/400.css';
import '@fontsource/noto-sans-devanagari/500.css';
import '@fontsource/noto-sans-devanagari/600.css';
import '@fontsource/noto-sans-devanagari/700.css';
import '@/app/globals.css';

export const metadata = {
  title: 'सदस्यता शुल्क व्यवस्थापन प्रणाली - Membership Billing Portal',
  description: 'Membership billing management system',
  keywords: 'membership, billing, management',
  authors: [{ name: organizationConfig.nameEnglish }],
  other: {
    google: 'notranslate',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="ne" translate="no" className="light notranslate" data-scroll-behavior="smooth">
      <body translate="no" className="min-h-screen antialiased notranslate">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
