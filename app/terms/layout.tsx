import type { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `SMS Terms & Conditions | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `SMS terms for ${SITE_BRAND_NAME} in Phoenix, AZ — message types, frequency, opt-out, and consent.`,
  keywords: [
    'SMS terms nail salon Phoenix',
    `${SITE_BRAND_NAME} SMS terms`,
    'text message terms',
  ],
  openGraph: {
    title: `SMS Terms & Conditions — ${SITE_BRAND_NAME}`,
    description: `Terms for SMS appointment confirmations, reminders, and customer care from ${SITE_BRAND_NAME}.`,
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/terms'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-image.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} — SMS terms`,
      },
    ],
  },
  alternates: {
    canonical: '/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
