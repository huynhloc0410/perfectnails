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
} from '@/lib/site/contact';
import { summarizeHoursLabel } from '@/lib/site/hours';
import { fetchCmsSite, fetchPublicSiteData } from '@/lib/cms/site-client';
import { normalizeCmsGalleryList } from '@/lib/cmsSiteTypes';
import { galleryThumbSrc } from '@/lib/galleryDisplay';
import { formatUsd } from '@/lib/format/currency';
import { readLocalStorageJson } from '@/lib/storage/local-json';
import {
  SITE_BRAND_NAME,
  SITE_HERO_APPOINTMENT_LINE,
  SITE_HOURS_FALLBACK_SUMMARY,
  SITE_PRIMARY_AREA,
  SITE_STANDARD_INTRO,
  SITE_TRUST_POINTS,
  SITE_TRUST_SECTION_LABEL,
} from '@/lib/site/branding';

/** Single still hero — luxury direction: one focal visual, no carousel. */
const HERO_IMAGE = '/images/nail0.webp';

/** Fallback thumbnails when CMS gallery empty */
const GALLERY_FALLBACK = ['/images/nail0.webp', '/images/nail1.webp', '/images/nail2.jpeg'] as const;

const HERO_ACTION_BTN =
  'cta-flash-btn font-display relative flex min-h-[4.75rem] w-full items-center justify-center overflow-hidden rounded-md border-2 border-champagne-300/55 bg-lux-espresso/45 px-8 py-4 text-center text-lg font-semibold uppercase leading-tight tracking-[0.12em] text-champagne-100 shadow-[0_4px_18px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-champagne-200/75 hover:bg-lux-espresso/55 active:scale-[0.99] sm:text-xl';

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
        const data = await fetchPublicSiteData();
        if (cancelled) return;
        if (data.configured && data.site && !data.error) {
          const c = data.site.contact;
          if (c && typeof c === 'object') {
            if (c.phone) {
              setCallHref(toTelHref(c.phone));
              setPhoneDisplay(formatPhoneDisplay(c.phone));
            }
            setHeroAddress(effectiveContactAddress(c.address));
            if (typeof c.hours === 'string') setHoursSummary(summarizeHoursLabel(c.hours));
          }
          if (Array.isArray(data.site.services) && data.site.services.length > 0) {
            const list = data.site.services as PreviewService[];
            setServicePreview(list.slice(0, 6));
          }
        }
        const galleryData = await fetchCmsSite();
        if (cancelled) return;
        if (
          galleryData.configured &&
          galleryData.site &&
          Array.isArray(galleryData.site.gallery) &&
          galleryData.site.gallery.length > 0
        ) {
          const thumbs = normalizeCmsGalleryList(galleryData.site.gallery)
            .slice(0, 4)
            .map(galleryThumbSrc);
          setGalleryPreview(thumbs);
        }
        if (data.configured && data.site) return;
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      migrateLegacyStoredContactAddress();
      const c = readLocalStorageJson<{ phone?: string; address?: string; hours?: string }>('admin-contact');
      if (c) {
        if (c.phone) {
          setCallHref(toTelHref(c.phone));
          setPhoneDisplay(formatPhoneDisplay(c.phone));
        }
        setHeroAddress(effectiveContactAddress(c.address));
        if (c.hours) setHoursSummary(summarizeHoursLabel(c.hours));
      }
      const list = readLocalStorageJson<PreviewService[]>('admin-services');
      if (Array.isArray(list) && list.length) setServicePreview(list.slice(0, 6));
      const g = readLocalStorageJson<unknown>('admin-gallery');
      const items = normalizeCmsGalleryList(g);
      if (items.length) setGalleryPreview(items.slice(0, 4).map(galleryThumbSrc));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(heroAddress)}`;

  return (
    <>
      <section
        className="relative isolate min-h-[min(78svh,720px)] w-full overflow-hidden bg-lux-espresso"
        aria-labelledby="hero-heading"
      >
        <img
          src={HERO_IMAGE}
          alt={`${SITE_BRAND_NAME} nail salon — Phoenix, AZ`}
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-lux-espresso/95 via-lux-espresso/35 to-lux-espresso/25"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-px bg-gradient-to-r from-transparent via-champagne-400/35 to-transparent" aria-hidden />

        <div className="relative z-10 mx-auto flex min-h-[min(78svh,720px)] w-full max-w-3xl flex-col px-6 pb-10 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:max-w-4xl sm:px-10 sm:pb-14 sm:pt-[calc(4rem+env(safe-area-inset-top,0px))] md:pb-16">
          <div className="flex w-full flex-1 flex-col items-center justify-start text-center">
            <p className="hero-eyebrow inline-flex max-w-lg items-center justify-center rounded-full border border-champagne-400/45 bg-black/50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.26em] text-champagne-100 shadow-[0_2px_16px_rgba(0,0,0,0.35)] backdrop-blur-md sm:text-[10px] sm:tracking-[0.28em]">
              Nail studio · {SITE_PRIMARY_AREA}
            </p>
            <h1
              id="hero-heading"
              className="font-display mt-2.5 max-w-2xl text-[1.75rem] font-medium leading-[1.15] tracking-[0.02em] text-white sm:mt-3 sm:text-4xl md:text-[2.5rem]"
            >
              {SITE_BRAND_NAME}
            </h1>
            <div className="mx-auto mt-2 h-px w-12 bg-gradient-to-r from-transparent via-champagne-400/70 to-transparent sm:mt-2.5 sm:w-14" aria-hidden />

            <div className="mt-6 flex w-full max-w-md flex-col gap-2.5 sm:mt-7">
              <Link href="/services" className={HERO_ACTION_BTN}>
                Services &amp; prices
              </Link>
              <Link href="/gallery" className={HERO_ACTION_BTN}>
                Gallery
              </Link>

              <p className="hidden text-sm font-light leading-relaxed text-white/75 md:block">
                {SITE_HERO_APPOINTMENT_LINE}
              </p>

              <a href={callHref} className={`${HERO_ACTION_BTN} flex-col gap-1`}>
                <span>Call</span>
                <span className="text-lg normal-case tracking-normal sm:text-xl">{phoneDisplay}</span>
              </a>
              <Link href="/booking" className={HERO_ACTION_BTN}>
                Book Now
              </Link>
            </div>

            <address className="mx-auto mt-5 w-full max-w-md not-italic sm:mt-6">
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
            <p className="mx-auto mt-5 max-w-xl font-light leading-relaxed text-lux-espressoLight sm:mt-6 sm:text-[1.0625rem]">
              {SITE_STANDARD_INTRO}
            </p>
            <div className="mx-auto mt-8 h-px w-12 bg-lux-line sm:mt-9" aria-hidden />
          </div>
          <div className="mt-12 grid gap-10 sm:mt-14 sm:grid-cols-3 sm:gap-8">
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
                    <p className="font-display text-2xl font-medium text-lux-espresso">${formatUsd(Number(s.price))}</p>
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
                    alt={`Nail art preview ${i + 1} — ${SITE_BRAND_NAME}`}
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
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
