import Link from 'next/link';
import type { CmsContact } from '@/lib/cmsSiteTypes';
import { SITE_BRAND_NAME, siteSalonGoogleMapsUrl } from '@/lib/site/branding';
import { effectiveContactAddress, formatPhoneDisplay, toTelHref } from '@/lib/site/contact';
import SiteLogoLink from './SiteLogoLink';

export default function SiteFooter({ contact }: { contact: CmsContact }) {
  const year = new Date().getFullYear();
  const address = effectiveContactAddress(contact.address);
  const phoneDisplay = formatPhoneDisplay(contact.phone);
  const phoneHref = toTelHref(contact.phone);
  const mapsUrl = siteSalonGoogleMapsUrl(address);

  return (
    <footer className="font-nav mt-auto border-t border-lux-line/40 bg-gradient-to-b from-lux-paper to-lux-cream/50">
      <div className="mx-auto max-w-3xl px-4 py-5 text-center sm:px-6 sm:py-6">
        <SiteLogoLink variant="footer" />
        <p className="footer-animate-in footer-animate-in-delay-1 mx-auto mt-1.5 max-w-md text-xs leading-snug text-gray-600 sm:text-sm">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="footer-action-link">
            {address}
          </a>
        </p>
        <div className="footer-animate-in footer-animate-in-delay-2 mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm font-medium text-gray-700 sm:mt-4 sm:text-[15px]">
          <a href={phoneHref} className="footer-action-link">
            {phoneDisplay}
          </a>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <a href={mapsUrl} className="footer-action-link" target="_blank" rel="noopener noreferrer">
            Directions
          </a>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/contact" className="footer-action-link">
            Contact
          </Link>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/policy" className="footer-action-link">
            Policy
          </Link>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/privacy" className="footer-action-link">
            Privacy
          </Link>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/terms" className="footer-action-link">
            Terms
          </Link>
          <span className="hidden text-champagne-300 sm:inline" aria-hidden>
            ·
          </span>
          <Link href="/booking" className="footer-action-link">
            Book
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-gray-500 sm:mt-5 sm:text-xs">
          © {year} {SITE_BRAND_NAME} · Phoenix, Arizona
        </p>
      </div>
    </footer>
  );
}
