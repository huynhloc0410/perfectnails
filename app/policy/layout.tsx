import type { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Salon Policies | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `Salon policies for ${SITE_BRAND_NAME} in Phoenix, AZ — appointments, late arrivals, refunds, health and safety, payments, and promotions.`,
  keywords: [
    'nail salon policies Phoenix',
    'salon policy',
    `${SITE_BRAND_NAME} policies`,
    'appointment policy nail salon',
  ],
  openGraph: {
    title: `Salon Policies — ${SITE_BRAND_NAME}`,
    description: `Read ${SITE_BRAND_NAME} salon policies before your visit — appointments, safety, payments, and more.`,
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/policy'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-image.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} — salon policies`,
      },
    ],
  },
  alternates: {
    canonical: '/policy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
