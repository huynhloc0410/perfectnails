/** Display name for nav, footer, SEO, and JSON-LD (legal/DB names may differ). */
export const SITE_BRAND_NAME = 'Perfect Nails & Spa';

/** Homepage `<title>` — local terms + brand; keep under ~60 chars when possible for SERPs. */
export const SITE_SEO_HOME_TITLE = `${SITE_BRAND_NAME} | Nail Salon Phoenix · Manicure & Pedicure`;

/** Homepage meta description — used on `/` and as site default in root layout. */
export const SITE_SEO_HOME_DESCRIPTION =
  'Professional nail salon near Bell Rd, Phoenix, AZ. We offer manicure, pedicure, nail art and more. Book your appointment today — convenient when you need a nail salon near me.';

/** Declarative keywords (limited ranking value on Google; useful for other tools / consistency). */
export const SITE_SEO_KEYWORDS = [
  'nail salon phoenix',
  'nail salon near me',
  'manicure phoenix',
  'pedicure phoenix',
  'nail salon Phoenix AZ',
  'Bell Rd nail salon',
  'gel nails Phoenix',
  'nail art Phoenix',
  SITE_BRAND_NAME,
] as const;

/** Single source for public-facing city/area copy — aligns with `SITE_DEFAULT_ADDRESS` (Phoenix). */
export const SITE_PRIMARY_AREA = 'Phoenix, AZ';

/** Structured address for JSON-LD (matches default street; CMS may differ on live pages). */
export const SITE_SCHEMA_POSTAL_ADDRESS = {
  streetAddress: '4030 E Bell Rd #110',
  addressLocality: 'Phoenix',
  addressRegion: 'AZ',
  postalCode: '85032',
  addressCountry: 'US',
} as const;

const _siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
export const SITE_PUBLIC_URL = (_siteUrl && _siteUrl.startsWith('http') ? _siteUrl : 'https://perfectnails.com') as string;

/**
 * Salon logo served from `public/` (tab icon uses the same asset via `app/icon.png` when kept in sync).
 * Change this if you replace the file (e.g. `/logo.svg`).
 */
export const SITE_LOGO_PATH = '/logo.png';

/** Absolute URL for a path on this site (path should start with `/`). */
export function siteAbsoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_PUBLIC_URL}${p}`;
}

/** Luxury tone: quiet, confident; serif H1 carries the brand. */
export const SITE_HERO_SERVICE_LINE =
  'Pedicure, manicure, and nail enhancements — meticulous work, transparent pricing, and a calm studio experience.';

/** Appointments + walk-ins — restrained copy. */
export const SITE_HERO_APPOINTMENT_LINE =
  'By appointment preferred. Walk-ins always welcome when we have availability.';

/** Short hours fallback when CMS hours are empty. */
export const SITE_HOURS_FALLBACK_SUMMARY = 'Mon–Fri 9am–7pm · Sat–Sun 10am–6pm';

export const SITE_TRUST_SECTION_LABEL = 'Our standard';

export const SITE_TRUST_POINTS = [
  {
    title: 'Discretion & hygiene',
    body: 'A clean station and properly prepared tools for every guest — non-negotiable.',
  },
  {
    title: 'Craft, not rush',
    body: 'Experienced hands across natural nails, gel systems, enhancements, and art.',
  },
  {
    title: 'Respect for your time',
    body: 'Reserve ahead for the slot you want; we’ll happily seat walk-ins when the schedule allows.',
  },
] as const;
