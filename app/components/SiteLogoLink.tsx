'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_BRAND_NAME, SITE_LOGO_PATH } from '../lib/siteBranding';

type Variant = 'header' | 'footer';

/**
 * Header: compact circle aligned with the nav row (same ballpark as the h-11 menu button),
 * not full header strip height — avoids an oversized mark on desktop and mobile.
 */
const headerBadgeClass =
  'box-border flex size-11 shrink-0 overflow-hidden rounded-full border-2 border-champagne-300 bg-lux-paper p-1 shadow-[0_0_0_1px_rgba(201,184,150,0.45)] sm:size-12 sm:p-1.5';

const headerImgClass = 'size-full rounded-full object-contain object-center';

/** Footer: same round + champagne frame, modest size above contact copy. */
const footerBadgeClass =
  'box-border flex size-[4.5rem] shrink-0 overflow-hidden rounded-full border-2 border-champagne-300 bg-lux-paper p-1.5 shadow-[0_0_0_1px_rgba(201,184,150,0.45)] sm:size-20 sm:p-2';

const footerImgClass = headerImgClass;

export default function SiteLogoLink({ variant }: { variant: Variant }) {
  const [showWordmark, setShowWordmark] = useState(false);

  if (variant === 'header') {
    if (showWordmark) {
      return (
        <Link
          href="/"
          className="font-display min-w-0 flex-1 text-center text-[1.35rem] font-semibold leading-tight tracking-tight text-neutral-900 md:flex-none md:text-left md:text-[1.5rem]"
        >
          <span className="site-brand-gradient">{SITE_BRAND_NAME}</span>
        </Link>
      );
    }
    return (
      <Link
        href="/"
        className="font-display flex min-w-0 flex-1 items-center justify-center md:flex-none md:justify-start"
      >
        <span className={headerBadgeClass}>
          <img
            src={SITE_LOGO_PATH}
            alt=""
            width={96}
            height={96}
            className={headerImgClass}
            onError={() => setShowWordmark(true)}
          />
        </span>
        <span className="sr-only">{SITE_BRAND_NAME}</span>
      </Link>
    );
  }

  if (showWordmark) {
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
          className={footerImgClass}
          onError={() => setShowWordmark(true)}
        />
      </span>
    </Link>
  );
}
