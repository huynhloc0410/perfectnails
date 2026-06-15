'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { fetchPublicSiteData } from '@/lib/cms/site-client';
import {
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  formatPhoneDisplay,
  migrateLegacyStoredContactAddress,
  toTelHref,
} from '@/lib/site/contact';
import { readLocalStorageJson } from '@/lib/storage/local-json';

const HOME_SCROLL_THRESHOLD_PX = 120;

export default function MobileStickyCta() {
  const pathname = usePathname() || '/';
  const [phoneHref, setPhoneHref] = useState(SITE_PHONE_HREF);
  const [phoneLabel, setPhoneLabel] = useState(SITE_PHONE_DISPLAY);
  const [visible, setVisible] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const isBooking = pathname.startsWith('/booking');
  const isHome = pathname === '/';

  const refresh = useCallback(async () => {
    migrateLegacyStoredContactAddress();
    try {
      const data = await fetchPublicSiteData();
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
    const c = readLocalStorageJson<{ phone?: string }>('admin-contact');
    if (c?.phone) {
      setPhoneHref(toTelHref(c.phone));
      setPhoneLabel(formatPhoneDisplay(c.phone));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (isAdmin || isBooking) {
      setVisible(false);
      return;
    }

    if (!isHome) {
      setVisible(true);
      return;
    }

    const update = () => {
      setVisible(window.scrollY > HOME_SCROLL_THRESHOLD_PX);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [isAdmin, isBooking, isHome]);

  useEffect(() => {
    document.body.classList.toggle('mobile-sticky-cta-visible', visible);
    return () => {
      document.body.classList.remove('mobile-sticky-cta-visible');
    };
  }, [visible]);

  if (isAdmin || isBooking) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[250] border-t border-lux-line/40 bg-lux-paper/97 px-3 py-2 backdrop-blur-md transition-transform duration-300 ease-out md:hidden pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] ${
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-lg gap-2">
        <a
          href={phoneHref}
          className="flex min-w-0 flex-[1.2] items-center justify-center border-2 border-lux-bronze/60 bg-lux-paper py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-lux-espresso active:scale-[0.98] sm:text-sm"
        >
          Call
        </a>
        <Link
          href="/booking"
          className="flex min-w-0 flex-1 items-center justify-center border border-lux-espresso/15 bg-lux-espresso py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-lux-paper active:scale-[0.98] sm:text-sm"
        >
          Book
        </Link>
      </div>
      <span className="sr-only">Call {phoneLabel} or book an appointment</span>
    </div>
  );
}
