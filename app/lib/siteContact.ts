/** Canonical salon address (hero, contact fallbacks, migrations). */
export const SITE_DEFAULT_ADDRESS = '4030 E Bell Rd #110, Phoenix, AZ 85032';

export const SITE_PHONE_DISPLAY = '(623) 302-2156';
export const SITE_PHONE_HREF = 'tel:+16233022156';

const LEGACY_ADDRESSES_LOWER = new Set([
  '10553 w pasadena ave, glendale, az 85305',
]);

/**
 * If admin-contact in localStorage still has the old default street, rewrite it
 * so the hero, contact page, and admin form all show the current address.
 */
export function migrateLegacyStoredContactAddress(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('admin-contact');
    if (!raw) return;
    const c = JSON.parse(raw) as { address?: string };
    const trimmed = (c.address ?? '').trim();
    if (trimmed && LEGACY_ADDRESSES_LOWER.has(trimmed.toLowerCase())) {
      c.address = SITE_DEFAULT_ADDRESS;
      localStorage.setItem('admin-contact', JSON.stringify(c));
    }
  } catch {
    /* ignore */
  }
}

/** Resolved line to show for maps / hero when storage may be empty. */
export function effectiveContactAddress(stored: string | undefined | null): string {
  const t = (stored ?? '').trim();
  if (!t) return SITE_DEFAULT_ADDRESS;
  if (LEGACY_ADDRESSES_LOWER.has(t.toLowerCase())) return SITE_DEFAULT_ADDRESS;
  return t;
}

/** `tel:` link for footer, hero, contact — falls back to site default. */
export function toTelHref(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return SITE_PHONE_HREF;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return `tel:+1${d}`;
  if (d.length === 11 && d.startsWith('1')) return `tel:+${d}`;
  if (d.length >= 10) return `tel:+${d}`;
  return SITE_PHONE_HREF;
}

/** Pretty phone for display — falls back to site default. */
export function formatPhoneDisplay(raw: string | undefined | null): string {
  if (!raw || !raw.trim()) return SITE_PHONE_DISPLAY;
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return raw.trim();
}
