/**
 * Browser fetch for `GET /api/cms/site` (public CMS bundle).
 * Keeps cache disabled so admin saves propagate quickly after refresh.
 */

/** Dispatched on `window` after admin saves (localStorage or S3) so public UIs can refetch. */
export const SITE_DATA_UPDATED_EVENT = 'perfectnails-site-updated';

/** Shape returned by `/api/cms/site` — intentionally loose on nested fields for forward compatibility. */
export interface CmsSiteApiResponse {
  configured?: boolean;
  source?: 'postgres' | 's3' | 'cms';
  site?: {
    services?: unknown[];
    employees?: unknown[];
    bookings?: unknown[];
    about?: { title?: string; content?: string };
    contact?: {
      address?: string;
      phone?: string;
      email?: string;
      hours?: string;
      socialMedia?: { facebook?: string; instagram?: string; yelp?: string; twitter?: string };
    };
    gallery?: Array<string | { full?: string; thumb?: string; url?: string }>;
    bookingBlocks?: unknown[];
  };
  error?: string;
  reason?: string;
}

export async function fetchCmsSite(): Promise<CmsSiteApiResponse> {
  const r = await fetch('/api/cms/site', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return r.json() as Promise<CmsSiteApiResponse>;
}

/** Public services, about, contact: Postgres when configured, else cms/S3. */
export async function fetchPublicSiteData(): Promise<CmsSiteApiResponse> {
  try {
    const pg = await fetch('/api/public/site-data', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (pg.ok) {
      const data = (await pg.json()) as CmsSiteApiResponse;
      if (data.configured && data.site) {
        return data;
      }
    }
  } catch {
    /* fall through */
  }
  const cms = await fetchCmsSite();
  if (cms.site) {
    return {
      ...cms,
      site: {
        services: cms.site.services,
        about: cms.site.about,
        contact: cms.site.contact,
      },
    };
  }
  return cms;
}

/** Public booking page: Postgres scheduling data when configured, else cms/S3. */
export async function fetchBookingSiteData(): Promise<CmsSiteApiResponse> {
  try {
    const pg = await fetch('/api/booking/site-data', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (pg.ok) {
      const data = (await pg.json()) as CmsSiteApiResponse;
      if (data.configured && data.source === 'postgres' && data.site) {
        return data;
      }
    }
  } catch {
    /* fall through to cms */
  }
  return fetchCmsSite();
}
