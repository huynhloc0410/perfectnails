import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import { Cormorant_Garamond, Outfit, Poppins } from "next/font/google";
import type { Metadata, Viewport } from "next";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

/* Elegant serif for the brand wordmark and hero headlines */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

/* Distinct UI font for navigation + footer (clearer than body Poppins) */
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nav",
});

export const metadata: Metadata = {
  title: {
    default: "Perfect Nails - Premium Nail Salon in Glendale, Arizona",
    template: "%s | Perfect Nails"
  },
  description: "Professional nail salon in Glendale, AZ offering manicures, pedicures, nail art, and premium nail care services. Book your appointment today.",
  keywords: ["nail salon Glendale AZ", "manicure Glendale", "pedicure Glendale", "nail art Glendale", "nail salon near me", "best nail salon Arizona"],
  authors: [{ name: "Perfect Nails" }],
  creator: "Perfect Nails",
  publisher: "Perfect Nails",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://perfectnails.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://perfectnails.com',
    siteName: 'Perfect Nails',
    title: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona',
    description: 'Professional nail salon offering manicures, pedicures, nail art, and premium nail care services.',
    images: [
      {
        url: 'https://perfectnails.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfect Nails - Premium Nail Salon in Glendale, Arizona',
    description: 'Professional nail salon offering manicures, pedicures, nail art, and premium nail care services.',
    images: ['https://perfectnails.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3e8",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.className} ${cormorant.variable} ${outfit.variable} flex min-h-screen flex-col bg-champagne-50 antialiased`}
      >
        <SiteHeader />

        <main className="w-full flex-1 overflow-x-hidden">{children}</main>

        <SiteFooter />
      </body>
    </html>
  );
}
