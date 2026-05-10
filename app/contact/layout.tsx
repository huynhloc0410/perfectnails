import { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Contact & Location | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `Contact ${SITE_BRAND_NAME} on E Bell Rd, Phoenix, AZ — phone, hours, map, and directions. Message us or book online.`,
  keywords: [
    'nail salon contact Phoenix',
    'Perfect Nails Spa phone',
    'nail salon Bell Rd Phoenix',
    'nail salon hours Phoenix AZ',
  ],
  openGraph: {
    title: `Contact — ${SITE_BRAND_NAME}`,
    description: `Visit or call ${SITE_BRAND_NAME} in Phoenix — address on E Bell Rd, hours, and map.`,
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/contact'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-contact.jpg'),
        width: 1200,
        height: 630,
        alt: `Contact ${SITE_BRAND_NAME} — Phoenix, Arizona`,
      },
    ],
  },
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

