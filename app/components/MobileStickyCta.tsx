'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fetchCmsSite } from '../lib/cmsSiteClient';
import {
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  formatPhoneDisplay,
  migrateLegacyStoredContactAddress,
  toTelHref,
} from '../lib/siteContact';

export default function MobileStickyCta() {
  const pathname = usePathname() || '/';
  const [phoneHref, setPhoneHref] = useState(SITE_PHONE_HREF);
  const [phoneLabel, setPhoneLabel] = useState(SITE_PHONE_DISPLAY);

  const refresh = useCallback(async () => {
    migrateLegacyStoredContactAddress();
    try {
      const data = await fetchCmsSite();
      if (data.configured && data.site?.contact && !data.error) {
        const c = data.site.contact;
        if (c.phone) {
          setPhoneHref(toTelHref(c.phone));
          setPhoneLabel(formatPhoneDisplay(c.phone));
        }
        return;
      }
    } catch {
      /* local */
    }
    const raw = localStorage.getItem('admin-contact');
    if (!raw) return;
    try {
      const c = JSON.parse(raw) as { phone?: string };
      if (c.phone) {
        setPhoneHref(toTelHref(c.phone));
        setPhoneLabel(formatPhoneDisplay(c.phone));
      }
    } catch {
      /* keep */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[250] border-t border-champagne-400/40 bg-white/95 px-3 py-2 backdrop-blur-md md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={phoneHref}
          className="flex min-w-0 flex-[1.25] items-center justify-center rounded-xl bg-gradient-to-br from-champagne-600 to-champagne-700 py-3.5 text-sm font-bold text-white shadow-md ring-1 ring-champagne-500/45 active:scale-[0.98] sm:text-base"
        >
          Call
        </a>
        <Link
          href="/booking"
          className="flex min-w-0 flex-1 items-center justify-center rounded-xl border-2 border-champagne-600/45 bg-white py-3.5 text-sm font-semibold text-champagne-900 shadow-sm active:scale-[0.98]"
        >
          Book
        </Link>
      </div>
      <span className="sr-only">Call {phoneLabel} or book an appointment</span>
    </div>
  );
}
