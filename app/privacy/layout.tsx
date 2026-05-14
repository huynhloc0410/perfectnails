import type { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Privacy Policy | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `Privacy policy for ${SITE_BRAND_NAME} in Phoenix, AZ — what we collect, how we use your information, and SMS consent.`,
  keywords: [
    'privacy policy nail salon Phoenix',
    `${SITE_BRAND_NAME} privacy`,
    'salon privacy policy',
  ],
  openGraph: {
    title: `Privacy Policy — ${SITE_BRAND_NAME}`,
    description: `How ${SITE_BRAND_NAME} collects, uses, and protects your personal information.`,
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/privacy'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-image.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} — privacy policy`,
      },
    ],
  },
  alternates: {
    canonical: '/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
