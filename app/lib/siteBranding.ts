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

/** One line under the hero H1 describing what you offer (scannable in ~3s). */
export const SITE_HERO_SERVICE_LINE =
  'Manicures, pedicures, gel, acrylic & nail art — all in one relaxing visit.';

/** Short hours fallback when CMS hours are empty. */
export const SITE_HOURS_FALLBACK_SUMMARY = 'Mon–Fri 9am–7pm · Sat–Sun 10am–6pm';

export const SITE_TRUST_POINTS = [
  { title: 'Sanitation first', body: 'Sterilized tools and a clean bench for every guest.' },
  { title: 'Skilled technicians', body: 'Experienced with natural nails, enhancements, and art.' },
  { title: 'Easy booking', body: 'Request a time online — we’ll confirm by phone or text.' },
] as const;
