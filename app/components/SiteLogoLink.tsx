'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SITE_BRAND_NAME, SITE_LOGO_PATH } from '../lib/siteBranding';

type Variant = 'header' | 'footer';

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
        <img
          src={SITE_LOGO_PATH}
          alt=""
          width={160}
          height={200}
          className="h-[52px] w-auto max-w-[min(120px,40vw)] object-contain object-center sm:h-14 md:h-[58px] md:max-w-[140px]"
          onError={() => setShowWordmark(true)}
        />
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
      <img
        src={SITE_LOGO_PATH}
        alt={`${SITE_BRAND_NAME} logo`}
        width={200}
        height={250}
        className="h-[72px] w-auto max-w-[200px] object-contain sm:h-20 sm:max-w-[220px]"
        onError={() => setShowWordmark(true)}
      />
    </Link>
  );
}
