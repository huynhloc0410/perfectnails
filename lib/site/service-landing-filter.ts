import type { CmsService } from '@/lib/cmsSiteTypes';
import type { ServiceSlug } from '@/lib/site/service-landing-pages';

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** Searchable text from CMS category + service name. */
function haystack(service: CmsService): string {
  return `${norm(service.category)} ${norm(service.name)}`;
}

/**
 * Maps each marketing URL (`/pedicure`, etc.) to CMS rows.
 * Matches on category and/or service name so admin labels like "Pedicure — Deluxe" still surface.
 */
export function serviceMatchesLandingSlug(service: CmsService, slug: ServiceSlug): boolean {
  const h = haystack(service);

  switch (slug) {
    case 'pedicure':
      return (
        h.includes('pedicure') ||
        /\bpedi\b/.test(h) ||
        h.includes('pedi ')
      );
    case 'manicure':
      return (
        h.includes('manicure') ||
        /\bmani\b/.test(h) ||
        h.includes('mani ')
      );
    case 'builder-gel':
      return (
        h.includes('builder gel') ||
        h.includes('gel builder') ||
        h.includes('builder-gel') ||
        (h.includes('builder') && h.includes('gel'))
      );
    case 'acrylic':
      return h.includes('acrylic');
    default:
      return false;
  }
}

export function filterServicesForLandingSlug(services: CmsService[], slug: ServiceSlug): CmsService[] {
  return services.filter((s) => serviceMatchesLandingSlug(s, slug));
}
