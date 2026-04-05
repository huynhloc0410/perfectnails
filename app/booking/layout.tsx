import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Book an Appointment - Schedule Your Nail Service | Perfect Nails',
  description: 'Book your nail salon appointment online at Perfect Nails in Glendale, AZ. Choose your service, technician, date, and time. Easy online booking available.',
  keywords: ['book nail appointment', 'nail salon booking Glendale', 'schedule nail service', 'online booking nail salon', 'appointment booking'],
  openGraph: {
    title: 'Book an Appointment - Perfect Nails',
    description: 'Schedule your nail service appointment online. Choose from our professional technicians and available time slots.',
    type: 'website',
    images: [
      {
        url: 'https://perfectnails.com/og-booking.jpg',
        width: 1200,
        height: 630,
        alt: 'Book an Appointment at Perfect Nails',
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

