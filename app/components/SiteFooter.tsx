'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchCmsSite } from '../lib/cmsSiteClient';
import {
  SITE_DEFAULT_ADDRESS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  effectiveContactAddress,
  formatPhoneDisplay,
  migrateLegacyStoredContactAddress,
  toTelHref,
} from '../lib/siteContact';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const [address, setAddress] = useState(SITE_DEFAULT_ADDRESS);
  const [phoneDisplay, setPhoneDisplay] = useState(SITE_PHONE_DISPLAY);
  const [phoneHref, setPhoneHref] = useState(SITE_PHONE_HREF);

  useEffect(() => {
    migrateLegacyStoredContactAddress();
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site?.contact && !data.error) {
          const c = data.site.contact;
          setAddress(effectiveContactAddress(c.address));
          setPhoneDisplay(formatPhoneDisplay(c.phone));
          setPhoneHref(toTelHref(c.phone));
          return;
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) {
        const raw = localStorage.getItem('admin-contact');
        if (raw) {
          try {
            const c = JSON.parse(raw) as { address?: string; phone?: string };
            setAddress(effectiveContactAddress(c.address));
            setPhoneDisplay(formatPhoneDisplay(c.phone));
            setPhoneHref(toTelHref(c.phone));
          } catch {
            /* keep defaults */
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <footer className="font-nav mt-auto border-t border-champagne-400/45 bg-gradient-to-b from-white to-champagne-50/90">
      <div className="mx-auto max-w-3xl px-4 py-5 text-center sm:px-6 sm:py-6">
        <Link
          href="/"
          className="font-display footer-animate-in inline-block text-xl font-semibold tracking-tight sm:text-[1.35rem]"
        >
          <span className="site-brand-gradient">Perfect Nails</span>
        </Link>
        <p className="footer-animate-in footer-animate-in-delay-1 mx-auto mt-1.5 max-w-md text-xs leading-snug text-gray-600 sm:text-sm">
          {address}
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
          <Link href="/booking" className="footer-action-link">
            Book
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-gray-500 sm:mt-5 sm:text-xs">
          © {year} Perfect Nails · Phoenix, Arizona
        </p>
      </div>
    </footer>
  );
}
