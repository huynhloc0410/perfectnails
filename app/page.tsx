import { Metadata } from 'next';
import HomeContent from './components/HomeContent';
import {
  SITE_BRAND_NAME,
  SITE_PUBLIC_URL,
  SITE_SEO_HOME_DESCRIPTION,
  SITE_SEO_HOME_TITLE,
  SITE_SEO_KEYWORDS,
} from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: SITE_SEO_HOME_TITLE,
  },
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
  return <HomeContent />;
}
