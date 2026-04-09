'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_BRAND_NAME, SITE_LOGO_PATH } from '../lib/siteBranding';

type Variant = 'header' | 'footer';

/** Shared round badge: header matches footer; thin champagne edge. */
const roundBadgeBase =
  'box-border flex shrink-0 overflow-hidden rounded-full border border-champagne-400/55 bg-lux-paper shadow-[0_0_0_0.5px_rgba(201,184,150,0.35)]';

const logoBadgeSize = 'size-[4.5rem] p-1.5 sm:size-20 sm:p-2';

const badgeClass = `${roundBadgeBase} ${logoBadgeSize}`;

const imgClass = 'size-full rounded-full object-contain object-center';

export default function SiteLogoLink({ variant }: { variant: Variant }) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (variant === 'header') {
    return (
      <Link
        href="/"
        className={`font-display flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 ${
          logoFailed ? 'justify-center md:justify-start' : 'justify-start'
        }`}
      >
        <span
          className={`site-brand-gradient min-w-0 font-semibold leading-tight tracking-tight ${
            logoFailed
              ? 'flex-1 text-center text-[1.35rem] md:flex-none md:text-left md:text-[1.5rem]'
              : 'text-[1.05rem] sm:text-[1.15rem] md:text-[1.35rem]'
          }`}
        >
          {SITE_BRAND_NAME}
        </span>
        {!logoFailed && (
          <span className={badgeClass}>
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
      <span className={badgeClass}>
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
