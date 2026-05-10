import { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Nail Art Gallery | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `Browse nail art and design inspiration from ${SITE_BRAND_NAME} in Phoenix, AZ — gel, acrylic, and custom styles.`,
  keywords: [
    'nail art gallery Phoenix',
    'nail designs Phoenix AZ',
    'nail inspiration',
    'gel nail art Phoenix',
  ],
  openGraph: {
    title: `Gallery — ${SITE_BRAND_NAME}`,
    description: 'Nail art and design work from our Phoenix studio.',
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/gallery'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-gallery.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} — nail art gallery`,
      },
    ],
  },
  alternates: {
    canonical: '/gallery',
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

