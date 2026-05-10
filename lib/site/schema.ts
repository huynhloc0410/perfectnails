import { SITE_PHONE_HREF } from '@/lib/site/contact';
import {
  SITE_BRAND_NAME,
  SITE_LOGO_PATH,
  SITE_PUBLIC_URL,
  SITE_SCHEMA_POSTAL_ADDRESS,
  SITE_SEO_HOME_DESCRIPTION,
  siteAbsoluteUrl,
  siteSalonGoogleMapsUrl,
} from '@/lib/site/branding';

/** Approximate geo for structured data (4030 E Bell Rd, Phoenix, AZ). */
export const SITE_SCHEMA_GEO = {
  latitude: 33.6389,
  longitude: -112.0155,
} as const;

const OG_IMAGE = `${SITE_PUBLIC_URL}/og-image.jpg`;

function telToE164(href: string): string {
  const d = href.replace(/\D/g, '');
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  return '+16233022156';
}

/**
 * Primary entity: NailSalon + LocalBusiness for rich results / local SEO.
 * Single graph to avoid duplicate BeautySalon vs NailSalon conflicts.
 */
export function buildSalonJsonLd(): Record<string, unknown> {
  const telephone = telToE164(SITE_PHONE_HREF);
  const businessId = `${SITE_PUBLIC_URL}/#salon`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['NailSalon', 'LocalBusiness'],
        '@id': businessId,
        name: SITE_BRAND_NAME,
        description: SITE_SEO_HOME_DESCRIPTION,
        url: SITE_PUBLIC_URL,
        telephone,
        priceRange: '$$',
        image: [OG_IMAGE, siteAbsoluteUrl(SITE_LOGO_PATH)],
        logo: {
          '@type': 'ImageObject',
          url: siteAbsoluteUrl(SITE_LOGO_PATH),
        },
        address: {
          '@type': 'PostalAddress',
          streetAddress: SITE_SCHEMA_POSTAL_ADDRESS.streetAddress,
          addressLocality: SITE_SCHEMA_POSTAL_ADDRESS.addressLocality,
          addressRegion: SITE_SCHEMA_POSTAL_ADDRESS.addressRegion,
          postalCode: SITE_SCHEMA_POSTAL_ADDRESS.postalCode,
          addressCountry: SITE_SCHEMA_POSTAL_ADDRESS.addressCountry,
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: SITE_SCHEMA_GEO.latitude,
          longitude: SITE_SCHEMA_GEO.longitude,
        },
        hasMap: siteSalonGoogleMapsUrl(),
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '09:00',
            closes: '19:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Saturday', 'Sunday'],
            opens: '10:00',
            closes: '18:00',
          },
        ],
        areaServed: {
          '@type': 'City',
          name: SITE_SCHEMA_POSTAL_ADDRESS.addressLocality,
          containedInPlace: {
            '@type': 'State',
            name: 'Arizona',
          },
        },
      },
    ],
  };
}

/** About route: AboutPage + FAQPage in one graph (server-rendered). */
export function buildAboutPageDocumentsJsonLd(): Record<string, unknown> {
  const aboutUrl = siteAbsoluteUrl('/about');
  const orgId = `${SITE_PUBLIC_URL}/#salon`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${aboutUrl}#about`,
        name: `About ${SITE_BRAND_NAME}`,
        description: `Learn about ${SITE_BRAND_NAME}, Phoenix's premier nail salon. Discover our story, commitment to quality, and expert team.`,
        url: aboutUrl,
        mainEntity: { '@id': orgId },
      },
      {
        '@type': 'FAQPage',
        '@id': `${aboutUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: `What services does ${SITE_BRAND_NAME} offer?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${SITE_BRAND_NAME} offers professional nail care including manicures, pedicures, builder gel, acrylic, and custom nail art. We serve Phoenix, Arizona and nearby areas.`,
            },
          },
          {
            '@type': 'Question',
            name: `Where is ${SITE_BRAND_NAME} located?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${SITE_BRAND_NAME} is located at ${SITE_SCHEMA_POSTAL_ADDRESS.streetAddress}, ${SITE_SCHEMA_POSTAL_ADDRESS.addressLocality}, ${SITE_SCHEMA_POSTAL_ADDRESS.addressRegion} ${SITE_SCHEMA_POSTAL_ADDRESS.postalCode}.`,
            },
          },
          {
            '@type': 'Question',
            name: `What are ${SITE_BRAND_NAME}'s business hours?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${SITE_BRAND_NAME} is open Monday through Friday from 9:00 AM to 7:00 PM, and Saturday through Sunday from 10:00 AM to 6:00 PM.`,
            },
          },
          {
            '@type': 'Question',
            name: `How do I book an appointment at ${SITE_BRAND_NAME}?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Book online through our booking page or call us directly. You can choose your service and pick a time that works for you.',
            },
          },
        ],
      },
    ],
  };
}
