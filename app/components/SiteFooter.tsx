'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchCmsSite, SITE_DATA_UPDATED_EVENT } from '../lib/cmsSiteClient';
import {
  SITE_DEFAULT_ADDRESS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  effectiveContactAddress,
  formatPhoneDisplay,
  migrateLegacyStoredContactAddress,
  toTelHref,
} from '../lib/siteContact';
import { SITE_BRAND_NAME } from '../lib/siteBranding';
import SiteLogoLink from './SiteLogoLink';

function applyLocalContact(
  c: { address?: string; phone?: string } | null | undefined,
  setAddress: (v: string) => void,
  setPhoneDisplay: (v: string) => void,
  setPhoneHref: (v: string) => void
) {
  if (!c) return;
  setAddress(effectiveContactAddress(c.address));
  setPhoneDisplay(formatPhoneDisplay(c.phone));
  setPhoneHref(toTelHref(c.phone));
}

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const mountedRef = useRef(true);
  const [address, setAddress] = useState(SITE_DEFAULT_ADDRESS);
  const [phoneDisplay, setPhoneDisplay] = useState(SITE_PHONE_DISPLAY);
  const [phoneHref, setPhoneHref] = useState(SITE_PHONE_HREF);

  const refreshContact = useCallback(async () => {
    migrateLegacyStoredContactAddress();
    try {
      const data = await fetchCmsSite();
      if (!mountedRef.current) return;
      if (data.configured && data.site?.contact && !data.error) {
        const c = data.site.contact;
        const hasAddr = !!(c.address && String(c.address).trim());
        const hasPhone = !!(c.phone && String(c.phone).trim());
        if (hasAddr || hasPhone) {
          applyLocalContact(c, setAddress, setPhoneDisplay, setPhoneHref);
          return;
        }
      }
    } catch {
      /* fallback below */
    }
    if (!mountedRef.current) return;
    const raw = localStorage.getItem('admin-contact');
    if (raw) {
      try {
        applyLocalContact(JSON.parse(raw) as { address?: string; phone?: string }, setAddress, setPhoneDisplay, setPhoneHref);
      } catch {
        /* keep previous */
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refreshContact();

    const onSiteDataUpdated = () => {
      void refreshContact();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin-contact') void refreshContact();
    };
    const onFocus = () => {
      void refreshContact();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshContact();
    };

    window.addEventListener(SITE_DATA_UPDATED_EVENT, onSiteDataUpdated);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mountedRef.current = false;
      window.removeEventListener(SITE_DATA_UPDATED_EVENT, onSiteDataUpdated);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshContact]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <footer className="font-nav mt-auto border-t border-lux-line/40 bg-gradient-to-b from-lux-paper to-lux-cream/50">
      <div className="mx-auto max-w-3xl px-4 py-5 text-center sm:px-6 sm:py-6">
        <SiteLogoLink variant="footer" />
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
          <Link href="/policy" className="footer-action-link">
            Policy
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
