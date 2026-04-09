import { Metadata } from 'next';
import { siteAbsoluteUrl } from '../lib/siteBranding';

export const metadata: Metadata = {
  title: 'Our Services - Manicure, Pedicure, Gel X, Acrylic | Perfect Nails',
  description: 'Browse our complete range of professional nail services in Glendale, AZ. From classic manicures and pedicures to Gel X, Gel Builder, and Acrylic nails. Book your appointment today.',
  keywords: ['nail services Glendale', 'manicure services', 'pedicure services', 'Gel X nails', 'acrylic nails', 'nail art Glendale AZ'],
  openGraph: {
    title: 'Our Services - Perfect Nails',
    description: 'Professional nail services including manicures, pedicures, Gel X, and acrylic nails in Glendale, Arizona.',
    type: 'website',
    images: [
      {
        url: siteAbsoluteUrl('/og-services.jpg'),
        width: 1200,
        height: 630,
        alt: 'Perfect Nails Services - Manicure, Pedicure, Gel X, Acrylic',
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

