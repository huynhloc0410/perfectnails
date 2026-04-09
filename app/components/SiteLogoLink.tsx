'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_BRAND_NAME, SITE_LOGO_PATH } from '../lib/siteBranding';

type Variant = 'header' | 'footer';

/** Shared round badge: thin champagne edge. */
const roundBadgeBase =
  'box-border flex shrink-0 overflow-hidden rounded-full border border-champagne-400/55 bg-lux-paper shadow-[0_0_0_0.5px_rgba(201,184,150,0.35)]';

/** Footer: unchanged generous size. */
const footerBadgeSize = 'size-[4.5rem] p-1.5 sm:size-20 sm:p-2';

const footerBadgeClass = `${roundBadgeBase} ${footerBadgeSize}`;

/**
 * Header: compact on small screens (one line with menu); larger from md up.
 */
const headerBadgeClass = `${roundBadgeBase} size-10 p-1 sm:size-11 sm:p-1 md:size-[4.5rem] md:p-1.5 lg:size-20 lg:p-2`;

const imgClass = 'size-full rounded-full object-contain object-center';

export default function SiteLogoLink({ variant }: { variant: Variant }) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (variant === 'header') {
    return (
      <Link
        href="/"
        className={`font-display relative z-0 flex max-w-full min-w-0 shrink items-center gap-1.5 sm:gap-2 md:ml-6 md:shrink-0 md:gap-3 lg:ml-8 ${
          logoFailed ? 'justify-center md:justify-start' : 'justify-start'
        }`}
      >
        <span
          className={`site-brand-gradient min-w-0 shrink font-semibold leading-tight tracking-tight md:max-w-none ${
            logoFailed
              ? 'text-center text-[1.35rem] md:text-left md:text-[1.5rem]'
              : 'overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-[0.8125rem] md:overflow-visible md:text-[1.35rem] md:whitespace-normal'
          }`}
        >
          {SITE_BRAND_NAME}
        </span>
        {!logoFailed && (
          <span className={`relative z-0 shrink-0 ${headerBadgeClass}`}>
            <img
              src={SITE_LOGO_PATH}
              alt=""
              width={160}
              height={160}
              className={imgClass}
              onError={() => setLogoFailed(true)}
            />
          </span>
        )}
      </Link>
    );
  }

  if (logoFailed) {
    return (
      <Link
        href="/"
        className="font-display footer-animate-in inline-block text-xl font-semibold tracking-tight sm:text-[1.35rem]"
      >
        <span className="site-brand-gradient">{SITE_BRAND_NAME}</span>
      </Link>
    );
  }

  return (
    <Link href="/" className="font-display footer-animate-in inline-flex justify-center">
      <span className={footerBadgeClass}>
        <img
          src={SITE_LOGO_PATH}
          alt={`${SITE_BRAND_NAME} logo`}
          width={160}
          height={160}
          className={imgClass}
          onError={() => setLogoFailed(true)}
        />
      </span>
    </Link>
  );
}
