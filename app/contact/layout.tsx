import { Metadata } from 'next';
import { siteAbsoluteUrl } from '../lib/siteBranding';

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch | Perfect Nails Glendale, AZ',
  description: 'Contact Perfect Nails nail salon in Glendale, Arizona. Find our address, phone number, email, business hours, and social media links. We\'re here to help!',
  keywords: ['nail salon contact', 'nail salon Glendale address', 'nail salon phone number', 'nail salon hours', 'contact nail salon'],
  openGraph: {
    title: 'Contact Us - Perfect Nails',
    description: 'Get in touch with Perfect Nails. Find our location, contact information, and business hours.',
    type: 'website',
    images: [
      {
        url: siteAbsoluteUrl('/og-contact.jpg'),
        width: 1200,
        height: 630,
        alt: 'Contact Perfect Nails - Glendale, Arizona',
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

