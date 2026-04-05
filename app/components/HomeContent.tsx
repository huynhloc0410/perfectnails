'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  SITE_DEFAULT_ADDRESS,
  effectiveContactAddress,
  migrateLegacyStoredContactAddress,
} from '../lib/siteContact';
import { fetchCmsSite } from '../lib/cmsSiteClient';

const HERO_BACKGROUNDS = [
  '/images/nail0.webp',
  '/images/nail1.webp',
  '/images/nail2.jpeg',
] as const;

const DEFAULT_PHONE_DISPLAY = '(623) 302-2156';

function toTelHref(raw: string | undefined): string {
  if (!raw || !raw.trim()) return 'tel:+16233022156';
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `tel:+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `tel:+${d}`;
  if (d.length >= 10) return `tel:+${d}`;
  return 'tel:+16233022156';
}

function formatPhoneDisplay(raw: string | undefined): string {
  if (!raw || !raw.trim()) return DEFAULT_PHONE_DISPLAY;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw.trim();
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V21c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export default function HomeContent() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [callHref, setCallHref] = useState('tel:+16233022156');
  const [phoneDisplay, setPhoneDisplay] = useState(DEFAULT_PHONE_DISPLAY);
  const [heroAddress, setHeroAddress] = useState(SITE_DEFAULT_ADDRESS);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_BACKGROUNDS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site?.contact && !data.error) {
          const c = data.site.contact;
          if (c.phone) {
            setCallHref(toTelHref(c.phone));
            setPhoneDisplay(formatPhoneDisplay(c.phone));
          }
          setHeroAddress(effectiveContactAddress(c.address));
          return;
        }
      } catch {
        /* local fallback */
      }
      if (!cancelled) {
        migrateLegacyStoredContactAddress();
        const saved = localStorage.getItem('admin-contact');
        if (saved) {
          try {
            const c = JSON.parse(saved) as { phone?: string; address?: string };
            if (c.phone) {
              setCallHref(toTelHref(c.phone));
              setPhoneDisplay(formatPhoneDisplay(c.phone));
            }
            setHeroAddress(effectiveContactAddress(c.address));
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

  return (
    <section className="relative min-h-dvh w-full overflow-hidden">
      {/* 1 — Hero: full-bleed image, minimal copy, Book + Call */}
      {HERO_BACKGROUNDS.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
            i === heroIndex ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
          fetchPriority={i === 0 ? 'high' : 'low'}
        />
      ))}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/35"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center px-5 pb-10 pt-20 sm:max-w-xl sm:pb-12 sm:pt-24 md:pt-28">
        {/* Middle-top: centered vertically, then shifted up (not pinned to bottom) */}
        <div className="flex w-full flex-1 flex-col items-center justify-center text-center motion-reduce:translate-y-0 -translate-y-[min(18vh,6.5rem)] sm:-translate-y-[min(22vh,8rem)] md:-translate-y-[min(24vh,9rem)]">
          <p className="font-display mb-8 max-w-sm text-3xl font-semibold leading-tight tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:mb-9 sm:max-w-md sm:text-4xl md:text-[2.75rem]">
            Beauty in Every Detail
          </p>
          <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
            <a
              href={callHref}
              className="cta-flash-btn cta-call-primary relative z-0 flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-full bg-[#f4728c] px-3 py-3 text-center shadow-lg sm:min-h-[4.5rem] sm:px-5"
            >
              <span className="relative z-[2] flex items-center gap-2 text-sm font-bold text-white sm:text-base">
                <PhoneIcon className="h-5 w-5 shrink-0 opacity-95 sm:h-[1.35rem] sm:w-[1.35rem]" />
                Call us
              </span>
              <span className="relative z-[2] text-[11px] font-medium leading-tight text-white/90 sm:text-xs">
                {phoneDisplay}
              </span>
            </a>
            <Link
              href="/booking"
              className="cta-flash-btn relative z-0 flex items-center justify-center rounded-full border-2 border-white/90 bg-white/15 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.98] sm:px-8 sm:text-base"
            >
              <span className="relative z-[2]">Book online</span>
            </Link>
            <Link
              href="/gallery"
              className="cta-flash-btn relative z-0 rounded-full border-2 border-white/90 bg-white/15 px-3 py-3.5 text-center text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.98] sm:px-6 sm:text-base"
            >
              <span className="relative z-[2]">See our work</span>
            </Link>
            <Link
              href="/services"
              className="cta-flash-btn relative z-0 rounded-full border-2 border-white/90 bg-white/15 px-3 py-3.5 text-center text-sm font-semibold leading-snug text-white shadow-lg backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.98] sm:px-5 sm:text-base"
            >
              <span className="relative z-[2]">Services and price</span>
            </Link>
          </div>
          <address className="mx-auto mt-[5rem] w-full max-w-md not-italic">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(heroAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-flash-btn relative z-0 flex w-full flex-col items-center justify-center gap-1 rounded-full border-2 border-white/90 bg-white/15 px-4 py-3.5 text-center shadow-lg backdrop-blur-sm transition hover:bg-white/25 active:scale-[0.98] sm:px-8 sm:py-4"
            >
              <span className="relative z-[2] text-sm font-semibold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:text-base">
                Address
              </span>
              <span className="relative z-[2] max-w-[28ch] text-[11px] font-medium leading-snug text-white/90 sm:text-xs">
                {heroAddress}
              </span>
            </a>
          </address>
        </div>
      </div>
    </section>
  );
}
