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

/** One line under the hero H1 — services + why new clients should look at prices & gallery. */
export const SITE_HERO_SERVICE_LINE =
  'Manicures, pedicures, gel, acrylic & nail art — honest pricing and real photos of our work.';

/** Walk-ins vs appointments — friendly, clear English. */
export const SITE_HERO_APPOINTMENT_LINE =
  'Walk-ins are always welcome when we have space. Calling or booking ahead is best — that way we save the time that works for you.';

/** Short hours fallback when CMS hours are empty. */
export const SITE_HOURS_FALLBACK_SUMMARY = 'Mon–Fri 9am–7pm · Sat–Sun 10am–6pm';

export const SITE_TRUST_POINTS = [
  { title: 'Sanitation first', body: 'Sterilized tools and a clean bench for every guest.' },
  { title: 'Skilled technicians', body: 'Experienced with natural nails, enhancements, and art.' },
  {
    title: 'Your time matters',
    body: 'Call or book ahead so we can hold the slot you want — walk-ins welcome when we can fit you in.',
  },
] as const;
