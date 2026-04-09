import { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '../lib/siteBranding';

export const metadata: Metadata = {
  title: `Gallery - Nail Art Portfolio | ${SITE_BRAND_NAME}`,
  description: `View our stunning nail art gallery featuring the latest designs, trends, and creative nail work from ${SITE_BRAND_NAME} in Glendale, Arizona.`,
  keywords: ['nail art gallery', 'nail designs Glendale', 'nail art portfolio', 'nail salon photos', 'nail inspiration'],
  openGraph: {
    title: `Gallery - ${SITE_BRAND_NAME}`,
    description: 'Browse our beautiful nail art gallery showcasing professional nail designs and creative work.',
    type: 'website',
    images: [
      {
        url: siteAbsoluteUrl('/og-gallery.jpg'),
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} Gallery - Professional Nail Art Portfolio`,
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

