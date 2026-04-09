import { Metadata } from 'next';
import HomeContent from './components/HomeContent';
import {
  SITE_BRAND_NAME,
  SITE_LOGO_PATH,
  SITE_PUBLIC_URL,
  SITE_SCHEMA_POSTAL_ADDRESS,
  SITE_SEO_HOME_DESCRIPTION,
  SITE_SEO_HOME_TITLE,
  SITE_SEO_KEYWORDS,
  siteAbsoluteUrl,
} from './lib/siteBranding';

export const metadata: Metadata = {
  title: SITE_SEO_HOME_TITLE,
  description: SITE_SEO_HOME_DESCRIPTION,
  keywords: [...SITE_SEO_KEYWORDS],
  openGraph: {
    title: SITE_SEO_HOME_TITLE,
    description: SITE_SEO_HOME_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    url: SITE_PUBLIC_URL,
    images: [
      {
        url: `${SITE_PUBLIC_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} - Nail salon in Phoenix, Arizona`,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: SITE_BRAND_NAME,
    description: SITE_SEO_HOME_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_SCHEMA_POSTAL_ADDRESS.streetAddress,
      addressLocality: SITE_SCHEMA_POSTAL_ADDRESS.addressLocality,
      addressRegion: SITE_SCHEMA_POSTAL_ADDRESS.addressRegion,
      postalCode: SITE_SCHEMA_POSTAL_ADDRESS.postalCode,
      addressCountry: SITE_SCHEMA_POSTAL_ADDRESS.addressCountry,
    },
    url: SITE_PUBLIC_URL,
    telephone: '+1-623-302-2156',
    priceRange: '$$',
    logo: siteAbsoluteUrl(SITE_LOGO_PATH),
    image: `${SITE_PUBLIC_URL}/og-image.jpg`,
    openingHours: 'Mo-Fr 09:00-19:00, Sa-Su 10:00-18:00',
    servesCuisine: false,
    acceptsReservations: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeContent />
    </>
  );
}
