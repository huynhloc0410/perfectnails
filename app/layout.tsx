import "./globals.css";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import MobileStickyCta from "./components/MobileStickyCta";
import { Cormorant_Garamond, Outfit, Poppins } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { SITE_BRAND_NAME, SITE_PUBLIC_URL } from "./lib/siteBranding";

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
    default: `${SITE_BRAND_NAME} - Nail Salon in Phoenix, AZ | Manicures & Pedicures`,
    template: `%s | ${SITE_BRAND_NAME}`,
  },
  description:
    "Professional nail salon in Phoenix, AZ — manicures, pedicures, gel, acrylic, nail art. Book online or call. Clean, relaxing studio near Bell Rd.",
  keywords: [
    "nail salon Phoenix AZ",
    "manicure Phoenix",
    "pedicure Phoenix",
    "gel nails Phoenix",
    "nail salon near me",
    "Bell Rd nail salon",
  ],
  authors: [{ name: SITE_BRAND_NAME }],
  creator: SITE_BRAND_NAME,
  publisher: SITE_BRAND_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_PUBLIC_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_PUBLIC_URL,
    siteName: SITE_BRAND_NAME,
    title: `${SITE_BRAND_NAME} - Nail Salon in Phoenix, AZ`,
    description: `Manicures, pedicures, gel & acrylic in Phoenix, AZ. Book online or call ${SITE_BRAND_NAME} today.`,
    images: [
      {
        url: `${SITE_PUBLIC_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: `${SITE_BRAND_NAME} - Nail salon in Phoenix, Arizona`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_BRAND_NAME} - Nail Salon in Phoenix, AZ`,
    description: `Manicures, pedicures, gel & acrylic in Phoenix, AZ. Book online or call today.`,
    images: [`${SITE_PUBLIC_URL}/og-image.jpg`],
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a241c",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${poppins.className} ${cormorant.variable} ${outfit.variable} flex min-h-screen flex-col bg-lux-paper antialiased`}
      >
        <SiteHeader />

        <main className="w-full flex-1 overflow-x-hidden pb-[4.75rem] md:pb-0">{children}</main>

        <MobileStickyCta />

        <SiteFooter />
      </body>
    </html>
  );
}
