import Link from 'next/link';
import {
  SITE_DEFAULT_ADDRESS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
} from '../lib/siteContact';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE_DEFAULT_ADDRESS)}`;

  return (
    <footer className="font-nav mt-auto border-t border-pink-100/90 bg-gradient-to-b from-white to-[#fff8fa]">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12">
        <Link
          href="/"
          className="font-display footer-animate-in inline-block text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
        >
          <span className="site-brand-gradient">Perfect Nails</span>
        </Link>
        <p className="footer-animate-in footer-animate-in-delay-1 mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-600">
          {SITE_DEFAULT_ADDRESS}
        </p>
        <div className="footer-animate-in footer-animate-in-delay-2 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] font-medium text-gray-700">
          <a href={SITE_PHONE_HREF} className="footer-action-link">
            {SITE_PHONE_DISPLAY}
          </a>
          <span className="hidden text-pink-200 sm:inline" aria-hidden>
            ·
          </span>
          <a href={mapsUrl} className="footer-action-link" target="_blank" rel="noopener noreferrer">
            Directions
          </a>
          <span className="hidden text-pink-200 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/contact" className="footer-action-link">
            Contact
          </Link>
          <span className="hidden text-pink-200 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/booking" className="footer-action-link">
            Book
          </Link>
        </div>
        <p className="mt-10 text-xs text-gray-500">
          © {year} Perfect Nails · Phoenix, Arizona
        </p>
      </div>
    </footer>
  );
}
