import { Metadata } from 'next';
import HomeContent from './components/HomeContent';

export const metadata: Metadata = {
  title: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona | Manicure & Pedicure Services',
  description: 'Professional nail salon in Glendale, AZ offering manicures, pedicures, nail art, and premium nail care services. Book your appointment today at Perfect Nails.',
  keywords: 'nail salon Glendale AZ, manicure Glendale, pedicure Glendale, nail art Glendale, nail salon near me, best nail salon Arizona',
  openGraph: {
    title: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona',
    description: 'Professional nail salon offering manicures, pedicures, nail art, and premium nail care services.',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://perfectnails.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: 'Perfect Nails',
    description: 'Premium nail salon in Glendale, Arizona offering professional manicure, pedicure, and nail art services',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Glendale',
      addressRegion: 'AZ',
      addressCountry: 'US',
    },
    url: 'https://perfectnails.com',
    telephone: '+1-623-302-2156',
    priceRange: '$$',
    image: 'https://perfectnails.com/logo.png',
    openingHours: 'Mo-Fr 09:00-19:00, Sa-Su 10:00-18:00',
    servesCuisine: false,
    acceptsReservations: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeContent />
    </>
  );
}
