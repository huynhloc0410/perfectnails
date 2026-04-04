import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us - Perfect Nails | Premier Nail Salon in Phoenix, Arizona',
  description: 'Learn about Perfect Nails, Phoenix\'s premier nail salon at 4030 E Bell Rd #110. Discover our story, expert nail technicians, commitment to quality manicures, pedicures, Gel X, and nail art services. Serving Phoenix, AZ since opening.',
  keywords: [
    'about nail salon Phoenix AZ',
    'nail salon Phoenix Arizona',
    'nail salon story',
    'nail salon team',
    'professional nail technicians Phoenix',
    'best nail salon Phoenix',
    'nail salon about us',
    'Perfect Nails story',
    'Phoenix nail salon history',
  ],
  openGraph: {
    title: 'About Us - Perfect Nails | Phoenix, Arizona Nail Salon',
    description: 'Learn about Perfect Nails, your premier nail salon in Phoenix, Arizona. Expert technicians, quality services, and a commitment to excellence.',
    type: 'website',
    url: 'https://perfectnails.com/about',
    images: [
      {
        url: 'https://perfectnails.com/og-about.jpg',
        width: 1200,
        height: 630,
        alt: 'About Perfect Nails - Phoenix, Arizona Nail Salon',
      },
    ],
  },
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

