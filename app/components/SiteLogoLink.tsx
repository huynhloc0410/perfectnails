'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_BRAND_NAME, SITE_LOGO_PATH } from '../lib/siteBranding';

type Variant = 'header' | 'footer';

/** Circular badge: fills stretched header row height (`h-full` on parent link). */
const headerBadgeClass =
  'box-border flex aspect-square h-full w-auto max-w-full shrink-0 overflow-hidden rounded-full border-2 border-champagne-300 bg-lux-paper p-1.5 shadow-[0_0_0_1px_rgba(201,184,150,0.45)] sm:p-2';

const headerImgClass = 'size-full rounded-full object-contain object-center';

/** Footer: same treatment, sized for the block (not full header height). */
const footerBadgeClass =
  'box-border flex aspect-square h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-full border-2 border-champagne-300 bg-lux-paper p-1.5 shadow-[0_0_0_1px_rgba(201,184,150,0.45)] sm:h-24 sm:w-24 sm:p-2';

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
        className="font-display flex flex-1 items-stretch justify-center self-stretch md:flex-none md:justify-start"
      >
        <span className={headerBadgeClass}>
          <img
            src={SITE_LOGO_PATH}
            alt=""
            width={200}
            height={200}
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
          width={220}
          height={220}
          className={footerImgClass}
          onError={() => setShowWordmark(true)}
        />
      </span>
    </Link>
  );
}
