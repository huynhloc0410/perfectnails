import { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_BRAND_NAME, siteAbsoluteUrl } from '@/lib/site/branding';

export const metadata: Metadata = {
  title: {
    absolute: `Book an Appointment | ${SITE_BRAND_NAME} | Phoenix, AZ`,
  },
  description: `Book nail services online at ${SITE_BRAND_NAME} in Phoenix, AZ — choose your service, technician, date, and time.`,
  keywords: [
    'book nail appointment Phoenix',
    'online nail booking',
    'schedule manicure Phoenix',
    `${SITE_BRAND_NAME} booking`,
  ],
  openGraph: {
    title: `Book online — ${SITE_BRAND_NAME}`,
    description: 'Schedule your nail appointment online — services, technicians, and available times.',
    type: 'website',
    locale: 'en_US',
    url: siteAbsoluteUrl('/booking'),
    siteName: SITE_BRAND_NAME,
    images: [
      {
        url: siteAbsoluteUrl('/og-booking.jpg'),
        width: 1200,
        height: 630,
        alt: `Book an appointment — ${SITE_BRAND_NAME}`,
      },
    ],
  },
  alternates: {
    canonical: '/booking',
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-[50vh] w-full bg-champagne-50/50" aria-hidden />}>
      {children}
    </Suspense>
  );
}

