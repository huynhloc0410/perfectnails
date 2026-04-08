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
  SITE_TRUST_SECTION_LABEL,
} from '../lib/siteBranding';

/** Single still hero — luxury direction: one focal visual, no carousel. */
const HERO_IMAGE = '/images/nail0.webp';

/** Fallback thumbnails when CMS gallery empty */
const GALLERY_FALLBACK = ['/images/nail0.webp', '/images/nail1.webp', '/images/nail2.jpeg'] as const;

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
  const [callHref, setCallHref] = useState(SITE_PHONE_HREF);
  const [phoneDisplay, setPhoneDisplay] = useState(SITE_PHONE_DISPLAY);
  const [heroAddress, setHeroAddress] = useState(SITE_DEFAULT_ADDRESS);
  const [hoursSummary, setHoursSummary] = useState(SITE_HOURS_FALLBACK_SUMMARY);
  const [servicePreview, setServicePreview] = useState<PreviewService[]>([]);
  const [galleryPreview, setGalleryPreview] = useState<string[]>([]);

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
      <section
        className="relative isolate min-h-[min(88svh,820px)] w-full overflow-hidden bg-lux-espresso"
        aria-labelledby="hero-heading"
      >
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-lux-espresso/95 via-lux-espresso/35 to-lux-espresso/25"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-champagne-400/35 to-transparent" aria-hidden />

        <div className="relative z-10 mx-auto flex min-h-[min(88svh,820px)] w-full max-w-3xl flex-col px-6 pb-16 pt-[calc(4.75rem+env(safe-area-inset-top,0px))] sm:max-w-4xl sm:px-10 sm:pb-20 sm:pt-[calc(5.25rem+env(safe-area-inset-top,0px))] md:pb-24">
          <div className="flex w-full flex-1 flex-col items-center justify-center text-center">
            <p className="max-w-lg text-[10px] font-medium uppercase tracking-[0.38em] text-champagne-300/95 sm:text-[11px]">
              Nail studio · {SITE_PRIMARY_AREA}
            </p>
            <h1
              id="hero-heading"
              className="font-display mt-8 max-w-2xl text-[2.125rem] font-medium leading-[1.15] tracking-[0.02em] text-white sm:mt-10 sm:text-5xl md:text-[3.25rem]"
            >
              Perfect Nails
            </h1>
            <div className="mx-auto mt-8 h-px w-14 bg-gradient-to-r from-transparent via-champagne-400/70 to-transparent sm:mt-9 sm:w-16" aria-hidden />

            <p className="mt-8 max-w-md font-light leading-[1.75] text-white/90 sm:mt-10 sm:max-w-lg sm:text-[1.0625rem]">
              {SITE_HERO_SERVICE_LINE}
            </p>
            <p className="mt-5 max-w-md font-light leading-relaxed text-white/75 sm:text-base">
              {SITE_HERO_APPOINTMENT_LINE}
            </p>

            <div className="mt-12 w-full max-w-md space-y-4 sm:mt-14">
              <a
                href={callHref}
                className="cta-call-primary flex w-full flex-col items-center justify-center gap-1 border-2 border-champagne-400/85 bg-lux-espresso/45 px-8 py-4 text-center backdrop-blur-md transition hover:border-champagne-300 hover:bg-lux-espresso/55"
              >
                <span className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-champagne-200">
                  <PhoneIcon className="h-4 w-4 text-champagne-300" />
                  Call
                </span>
                <span className="font-display text-lg font-medium text-white sm:text-xl">{phoneDisplay}</span>
              </a>
              <Link
                href="/booking"
                className="flex min-h-[3.25rem] w-full items-center justify-center border border-lux-espresso/20 bg-champagne-800/95 px-8 py-3.5 text-center text-[13px] font-medium uppercase tracking-[0.18em] text-champagne-50 shadow-lg transition hover:bg-champagne-800 active:scale-[0.99]"
              >
                Request an appointment
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 pt-4 text-[13px] font-medium tracking-wide text-white/85">
                <Link
                  href="/services"
                  className="border-b border-champagne-400/50 pb-0.5 transition hover:border-champagne-300 hover:text-white"
                >
                  Services &amp; prices
                </Link>
                <Link
                  href="/gallery"
                  className="border-b border-champagne-400/50 pb-0.5 transition hover:border-champagne-300 hover:text-white"
                >
                  Gallery
                </Link>
              </div>
            </div>

            <address className="mx-auto mt-14 w-full max-w-md not-italic sm:mt-16">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full flex-col items-center gap-2 border border-white/15 bg-black/25 px-6 py-5 text-center backdrop-blur-md transition hover:border-white/25 hover:bg-black/35"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-champagne-400/90">Visit</span>
                <span className="max-w-[32ch] text-sm font-light leading-relaxed text-white/95">{heroAddress}</span>
              </a>
            </address>
          </div>
        </div>
      </section>

      <section className="border-t border-lux-line/40 bg-lux-paper py-16 sm:py-20" aria-labelledby="trust-heading">
        <div className="container mx-auto max-w-5xl px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-lux-bronze">{SITE_TRUST_SECTION_LABEL}</p>
            <h2 id="trust-heading" className="font-display mt-4 text-2xl font-medium text-lux-espresso sm:text-[1.75rem]">
              Thoughtful care, every visit
            </h2>
            <div className="mx-auto mt-6 h-px w-12 bg-lux-line" aria-hidden />
          </div>
          <div className="mt-14 grid gap-10 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            {SITE_TRUST_POINTS.map((item) => (
              <div key={item.title} className="border-t border-lux-line/60 bg-lux-cream/50 px-2 pt-8 sm:px-4">
                <h3 className="font-display text-lg font-medium text-lux-espresso">{item.title}</h3>
                <p className="mt-3 text-sm font-light leading-relaxed text-lux-espressoLight/90">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {servicePreview.length > 0 && (
        <section
          className="border-t border-lux-line/30 bg-lux-cream/40 py-16 sm:py-20"
          aria-labelledby="popular-services-heading"
        >
          <div className="container mx-auto max-w-5xl px-6 sm:px-10">
            <div className="flex flex-col items-start justify-between gap-8 border-b border-lux-line/40 pb-10 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-lux-bronze">Menu</p>
                <h2 id="popular-services-heading" className="font-display mt-4 text-3xl font-medium text-lux-espresso sm:text-[2.125rem]">
                  Services &amp; pricing
                </h2>
                <p className="mt-4 max-w-xl font-light leading-relaxed text-lux-espressoLight sm:text-[1.0625rem]">
                  A selection of our offerings. Full menu and detail on the services page.
                </p>
              </div>
              <Link
                href="/services"
                className="shrink-0 border border-lux-espresso/25 bg-lux-paper px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-lux-espresso transition hover:border-lux-bronze/50 hover:bg-white"
              >
                View all
              </Link>
            </div>
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
              {servicePreview.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col justify-between border border-lux-line/50 bg-lux-paper/80 px-6 py-7 sm:px-7 sm:py-8"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lux-bronze/90">
                      {(s.category || '').trim() || 'Service'}
                    </p>
                    <h3 className="font-display mt-3 text-xl font-medium text-lux-espresso">{s.name}</h3>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-4 border-t border-lux-line/40 pt-6">
                    <p className="font-display text-2xl font-medium text-lux-espresso">${Number(s.price).toFixed(2)}</p>
                    <Link
                      href={`/booking?service=${encodeURIComponent(s.name)}`}
                      className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lux-bronze underline decoration-lux-line decoration-1 underline-offset-4 hover:text-lux-espresso"
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

      {(galleryPreview.length > 0 || GALLERY_FALLBACK.length > 0) && (
        <section
          className="border-t border-lux-line/30 bg-lux-paper py-16 sm:py-20"
          aria-labelledby="gallery-preview-heading"
        >
          <div className="container mx-auto max-w-5xl px-6 sm:px-10">
            <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-lux-bronze">Portfolio</p>
                <h2 id="gallery-preview-heading" className="font-display mt-4 text-3xl font-medium text-lux-espresso sm:text-[2.125rem]">
                  Recent work
                </h2>
                <p className="mt-4 max-w-xl font-light leading-relaxed text-lux-espressoLight sm:text-[1.0625rem]">
                  Work produced in our Phoenix studio.
                </p>
              </div>
              <Link
                href="/gallery"
                className="shrink-0 border border-lux-espresso/25 bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-lux-espresso transition hover:border-lux-bronze"
              >
                Full gallery
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5">
              {(galleryPreview.length > 0 ? galleryPreview : [...GALLERY_FALLBACK]).slice(0, 4).map((url, i) => (
                <Link
                  key={`${url}-${i}`}
                  href="/gallery"
                  className="group relative aspect-[4/5] overflow-hidden border border-lux-line/50 bg-lux-mist ring-1 ring-lux-line/20"
                >
                  <img
                    src={resolveImageSrc(url)}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-lux-line/40 bg-lux-cream/30 py-16 sm:py-20" aria-labelledby="hours-location-heading">
        <div className="container mx-auto max-w-5xl px-6 sm:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-lux-bronze">Hours &amp; directions</p>
          <h2 id="hours-location-heading" className="font-display mt-4 text-3xl font-medium text-lux-espresso sm:text-[2rem]">
            Visit us
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-10">
            <div className="border border-lux-line/50 bg-lux-paper/90 p-8">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lux-bronze">Hours</h3>
              <p className="mt-4 font-light leading-relaxed text-lux-espressoLight">{hoursSummary}</p>
              <Link
                href="/contact"
                className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-lux-espresso underline decoration-lux-line underline-offset-4"
              >
                Contact
              </Link>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col justify-center border border-lux-line/50 bg-lux-paper/90 p-8 transition hover:border-lux-bronze/40"
            >
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lux-bronze">Address</h3>
              <p className="mt-4 font-light leading-relaxed text-lux-espressoLight">{heroAddress}</p>
              <span className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-lux-bronze">Maps →</span>
            </a>
          </div>
          <div className="mt-12 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
            <a
              href={callHref}
              className="cta-call-primary inline-flex min-h-[3.5rem] items-center justify-center border-2 border-lux-bronze/70 bg-lux-paper px-10 text-sm font-semibold uppercase tracking-[0.22em] text-lux-espresso transition hover:bg-lux-cream"
            >
              Call {phoneDisplay}
            </a>
            <Link
              href="/booking"
              className="inline-flex min-h-[3.25rem] items-center justify-center border border-lux-espresso/20 bg-lux-espresso px-10 text-sm font-medium uppercase tracking-[0.2em] text-lux-paper transition hover:bg-lux-espressoLight"
            >
              Request appointment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
