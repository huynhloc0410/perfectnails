import { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Nail Services Menu — Manicure, Pedicure, Gel & Acrylic | ${SITE_BRAND_NAME}`,
  },
  description:
    'Browse manicures, pedicures, builder gel, acrylic, and nail art at Perfect Nails & Spa on E Bell Rd, Phoenix, AZ. Transparent pricing — book online.',
  keywords: [
    'nail services Phoenix AZ',
    'manicure Phoenix',
    'pedicure Phoenix',
    'acrylic nails Phoenix',
    'builder gel Phoenix',
    'Bell Rd nail salon',
  ],
  openGraph: {
    title: `Nail services — ${SITE_BRAND_NAME}`,
    description:
      'Professional nail services in Phoenix, Arizona — manicures, pedicures, enhancements, and nail art.',
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/services'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-services.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} — manicure, pedicure, gel, acrylic`,
      },
    ],
  },
  alternates: {
    canonical: '/services',
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

