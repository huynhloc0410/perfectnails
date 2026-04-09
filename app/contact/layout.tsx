import { Metadata } from 'next';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '../lib/siteBranding';

export const metadata: Metadata = {
  title: `Contact Us - Get in Touch | ${SITE_BRAND_NAME} Glendale, AZ`,
  description: `Contact ${SITE_BRAND_NAME} nail salon in Glendale, Arizona. Find our address, phone number, email, business hours, and social media links. We're here to help!`,
  keywords: ['nail salon contact', 'nail salon Glendale address', 'nail salon phone number', 'nail salon hours', 'contact nail salon'],
  openGraph: {
    title: `Contact Us - ${SITE_BRAND_NAME}`,
    description: `Get in touch with ${SITE_BRAND_NAME}. Find our location, contact information, and business hours.`,
    type: 'website',
    images: [
      {
        url: siteAbsoluteUrl('/og-contact.jpg'),
        width: 1200,
        height: 630,
        alt: `Contact ${SITE_BRAND_NAME} - Glendale, Arizona`,
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

