'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  SITE_DEFAULT_ADDRESS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  effectiveContactAddress,
  formatPhoneDisplay,
  migrateLegacyStoredContactAddress,
  toTelHref,
} from '../lib/siteContact';
import { fetchCmsSite } from '../lib/cmsSiteClient';
import {
  SITE_HERO_APPOINTMENT_LINE,
  SITE_HERO_SERVICE_LINE,
  SITE_HOURS_FALLBACK_SUMMARY,
  SITE_PRIMARY_AREA,
  SITE_TRUST_POINTS,
} from '../lib/siteBranding';

const HERO_BACKGROUNDS = ['/images/nail0.webp', '/images/nail1.webp', '/images/nail2.jpeg'] as const;

const HERO_ROTATE_MS = 7000;

type PreviewService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string;
};

function resolveImageSrc(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
  if (typeof window !== 'undefined' && u.startsWith('/')) return `${window.location.origin}${u}`;
  return u;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V21c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function summarizeHours(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return SITE_HOURS_FALLBACK_SUMMARY;
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return SITE_HOURS_FALLBACK_SUMMARY;
  if (lines.length === 1) return lines[0];
  return `${lines[0]} · ${lines[1]}`;
}

export default function HomeContent() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [callHref, setCallHref] = useState(SITE_PHONE_HREF);
  const [phoneDisplay, setPhoneDisplay] = useState(SITE_PHONE_DISPLAY);
  const [heroAddress, setHeroAddress] = useState(SITE_DEFAULT_ADDRESS);
  const [hoursSummary, setHoursSummary] = useState(SITE_HOURS_FALLBACK_SUMMARY);
  const [servicePreview, setServicePreview] = useState<PreviewService[]>([]);
  const [galleryPreview, setGalleryPreview] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_BACKGROUNDS.length);
    }, HERO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site && !data.error) {
          const c = data.site.contact;
          if (c && typeof c === 'object') {
            if (c.phone) {
              setCallHref(toTelHref(c.phone));
              setPhoneDisplay(formatPhoneDisplay(c.phone));
            }
            setHeroAddress(effectiveContactAddress(c.address));
            if (typeof c.hours === 'string') setHoursSummary(summarizeHours(c.hours));
          }
          if (Array.isArray(data.site.services) && data.site.services.length > 0) {
            const list = data.site.services as PreviewService[];
            setServicePreview(list.slice(0, 6));
          }
          if (Array.isArray(data.site.gallery) && data.site.gallery.length > 0) {
            setGalleryPreview((data.site.gallery as string[]).slice(0, 4));
          }
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      migrateLegacyStoredContactAddress();
      const saved = localStorage.getItem('admin-contact');
      if (saved) {
        try {
          const c = JSON.parse(saved) as { phone?: string; address?: string; hours?: string };
          if (c.phone) {
            setCallHref(toTelHref(c.phone));
            setPhoneDisplay(formatPhoneDisplay(c.phone));
          }
          setHeroAddress(effectiveContactAddress(c.address));
          if (c.hours) setHoursSummary(summarizeHours(c.hours));
        } catch {
          /* keep */
        }
      }
      const savedSvc = localStorage.getItem('admin-services');
      if (savedSvc) {
        try {
          const list = JSON.parse(savedSvc) as PreviewService[];
          if (Array.isArray(list) && list.length) setServicePreview(list.slice(0, 6));
        } catch {
          /* ignore */
        }
      }
      const savedGal = localStorage.getItem('admin-gallery');
      if (savedGal) {
        try {
          const g = JSON.parse(savedGal) as string[];
          if (Array.isArray(g) && g.length) setGalleryPreview(g.slice(0, 4));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(heroAddress)}`;

  return (
    <>
      <section className="relative isolate min-h-[72svh] w-full overflow-hidden" aria-labelledby="hero-heading">
        {HERO_BACKGROUNDS.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
              i === heroIndex ? 'z-[1] opacity-100' : 'z-0 opacity-0 pointer-events-none'
            }`}
            style={{ transform: 'translateZ(0)' }}
            aria-hidden
            fetchPriority={i === 0 ? 'high' : 'low'}
          />
        ))}
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-black/30 to-black/40" aria-hidden />

        <div className="relative z-10 mx-auto flex min-h-[72svh] w-full max-w-2xl flex-col px-5 pb-10 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pb-12 sm:pt-[calc(5rem+env(safe-area-inset-top,0px))] md:min-h-[78svh]">
          <div className="flex w-full flex-1 flex-col items-center justify-center text-center">
            <h1
              id="hero-heading"
              className="font-display max-w-xl text-3xl font-semibold leading-tight tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:text-4xl md:text-[2.85rem]"
            >
              Perfect Nails
            </h1>
            <p className="mt-2 max-w-md text-[13px] font-medium uppercase tracking-[0.18em] text-champagne-200/95 sm:text-sm">
              {SITE_PRIMARY_AREA}
            </p>
            <p className="mt-5 max-w-xl px-1 text-base font-medium leading-relaxed text-white sm:text-lg md:text-[1.15rem]">
              {SITE_HERO_SERVICE_LINE}
            </p>
            <p className="mt-3 max-w-xl px-1 text-sm leading-relaxed text-white/90 sm:text-base">
              {SITE_HERO_APPOINTMENT_LINE}
            </p>

            <div className="mt-8 w-full max-w-lg space-y-3 sm:mt-10">
              <a
                href={callHref}
                className="cta-flash-btn cta-call-primary relative z-0 flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-full bg-gradient-to-br from-champagne-500 to-champagne-700 px-6 text-center shadow-lg ring-1 ring-champagne-400/60 sm:min-h-[3.85rem]"
              >
                <span className="relative z-[2] flex items-center gap-2 text-base font-bold text-white sm:text-lg">
                  <PhoneIcon className="h-6 w-6 shrink-0 opacity-95 sm:h-7 sm:w-7" />
                  Call {phoneDisplay}
                </span>
                <span className="relative z-[2] text-[11px] font-medium text-white/85 sm:text-xs">Best for choosing your time</span>
              </a>
              <Link
                href="/booking"
                className="relative z-0 flex min-h-[3rem] w-full items-center justify-center rounded-full border-2 border-white/90 bg-white/12 px-6 text-center text-[15px] font-semibold text-white shadow-md backdrop-blur-sm transition hover:bg-white/22 active:scale-[0.98] sm:text-base"
              >
                <span className="relative z-[2]">Book online</span>
              </Link>
              <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-2 sm:gap-3">
                <Link
                  href="/services"
                  className="flex min-h-[3rem] items-center justify-center rounded-2xl border-2 border-white/85 bg-white/18 px-4 text-base font-bold text-white shadow-md backdrop-blur-sm transition hover:bg-white/28 sm:min-h-[3.25rem] sm:text-lg"
                >
                  Services &amp; prices
                </Link>
                <Link
                  href="/gallery"
                  className="flex min-h-[3rem] items-center justify-center rounded-2xl border-2 border-white/85 bg-white/18 px-4 text-base font-bold text-white shadow-md backdrop-blur-sm transition hover:bg-white/28 sm:min-h-[3.25rem] sm:text-lg"
                >
                  See our work
                </Link>
              </div>
            </div>

            <address className="mx-auto mt-8 w-full max-w-md not-italic sm:mt-10">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full flex-col items-center justify-center gap-1 rounded-2xl border border-white/35 bg-black/25 px-4 py-3.5 text-center backdrop-blur-sm transition hover:bg-black/35"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-champagne-200/90">Visit us</span>
                <span className="max-w-[32ch] text-sm font-medium leading-snug text-white">{heroAddress}</span>
              </a>
            </address>
          </div>
        </div>
      </section>

      <section className="border-t border-champagne-200/80 bg-gradient-to-b from-champagne-50 to-white py-10 sm:py-12" aria-label="Why book with us">
        <div className="container mx-auto max-w-5xl px-5 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {SITE_TRUST_POINTS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-champagne-200/60 bg-white/80 p-5 shadow-sm ring-1 ring-champagne-100/50"
              >
                <h2 className="font-display text-lg font-semibold text-neutral-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {servicePreview.length > 0 && (
        <section className="border-t border-champagne-200/60 bg-white py-12 sm:py-14" aria-labelledby="popular-services-heading">
          <div className="container mx-auto max-w-5xl px-5 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 id="popular-services-heading" className="font-display text-3xl font-semibold text-neutral-900 sm:text-[2rem]">
                  Services &amp; prices
                </h2>
                <p className="mt-2 max-w-xl text-base text-gray-600 sm:text-lg">
                  New here? Browse what we offer and what it costs — every card links to booking if you already know what you want.
                </p>
              </div>
              <Link
                href="/services"
                className="shrink-0 rounded-full border-2 border-champagne-600/40 bg-champagne-50 px-5 py-2.5 text-base font-bold text-champagne-950 transition hover:bg-champagne-100"
              >
                View all services
              </Link>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {servicePreview.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col justify-between rounded-2xl border border-champagne-200/70 bg-champagne-50/50 p-5 shadow-sm ring-1 ring-champagne-100/50 sm:p-6"
                >
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-champagne-800/90 sm:text-xs">
                      {(s.category || '').trim() || 'Service'}
                    </p>
                    <h3 className="mt-2 text-lg font-bold text-neutral-900 sm:text-xl">{s.name}</h3>
                  </div>
                  <div className="mt-5 flex items-end justify-between gap-3">
                    <p className="text-2xl font-bold text-champagne-800 sm:text-[1.75rem]">${Number(s.price).toFixed(2)}</p>
                    <Link
                      href={`/booking?service=${encodeURIComponent(s.name)}`}
                      className="rounded-full bg-champagne-600 px-4 py-2 text-sm font-bold text-white hover:bg-champagne-700"
                    >
                      Book
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {(galleryPreview.length > 0 || HERO_BACKGROUNDS.length > 0) && (
        <section className="border-t border-champagne-200/60 bg-gradient-to-b from-white to-champagne-50/80 py-12 sm:py-14" aria-labelledby="gallery-preview-heading">
          <div className="container mx-auto max-w-5xl px-5 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 id="gallery-preview-heading" className="font-display text-3xl font-semibold text-neutral-900 sm:text-[2rem]">
                  See our work
                </h2>
                <p className="mt-2 max-w-xl text-base text-gray-600 sm:text-lg">
                  Real nails from our Phoenix studio — tap through for the full gallery.
                </p>
              </div>
              <Link
                href="/gallery"
                className="shrink-0 rounded-full border-2 border-champagne-600/40 bg-white px-6 py-3 text-base font-bold text-champagne-950 transition hover:bg-champagne-50"
              >
                Open full gallery
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
              {(galleryPreview.length > 0
                ? galleryPreview
                : (HERO_BACKGROUNDS as unknown as string[]).slice(0, 4)
              ).map((url, i) => (
                <Link
                  key={`${url}-${i}`}
                  href="/gallery"
                  className="group relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-champagne-200/70 bg-stone-100 shadow-md ring-1 ring-champagne-100/40 sm:rounded-3xl"
                >
                  <img
                    src={resolveImageSrc(url)}
                    alt=""
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-champagne-300/35 bg-white py-10 sm:py-12" aria-labelledby="hours-location-heading">
        <div className="container mx-auto max-w-5xl px-5 sm:px-6">
          <h2 id="hours-location-heading" className="font-display text-2xl font-semibold text-neutral-900 sm:text-[1.65rem]">
            Hours &amp; location
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-champagne-200/70 bg-champagne-50/50 p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide text-champagne-900/90">Today&apos;s hours</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-800">{hoursSummary}</p>
              <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-champagne-800 underline underline-offset-4">
                Full details &amp; contact
              </Link>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col justify-center rounded-2xl border border-champagne-300/50 bg-white p-5 shadow-sm transition hover:border-champagne-500/60 hover:shadow-md"
            >
              <h3 className="text-sm font-bold uppercase tracking-wide text-champagne-900/90">Directions</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-800">{heroAddress}</p>
              <span className="mt-3 text-sm font-semibold text-champagne-700">Open in Maps →</span>
            </a>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href={callHref}
              className="inline-flex w-full min-h-[3.25rem] max-w-sm items-center justify-center rounded-full bg-gradient-to-br from-champagne-600 to-champagne-700 px-8 text-base font-bold text-white shadow-md ring-1 ring-champagne-500/50 sm:w-auto"
            >
              Call {phoneDisplay}
            </a>
            <Link
              href="/booking"
              className="inline-flex w-full min-h-[3rem] max-w-sm items-center justify-center rounded-full border-2 border-champagne-600/50 bg-white px-8 text-base font-semibold text-champagne-900 shadow-sm sm:w-auto"
            >
              Book online
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
