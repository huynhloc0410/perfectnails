/**
 * Browser fetch for `GET /api/cms/site` (public CMS bundle).
 * Keeps cache disabled so admin saves propagate quickly after refresh.
 */

/** Dispatched on `window` after admin saves (localStorage or S3) so public UIs can refetch. */
export const SITE_DATA_UPDATED_EVENT = 'perfectnails-site-updated';

/** Shape returned by `/api/cms/site` — intentionally loose on nested fields for forward compatibility. */
export interface CmsSiteApiResponse {
  configured?: boolean;
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
}

export async function fetchCmsSite(): Promise<CmsSiteApiResponse> {
  const r = await fetch('/api/cms/site', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return r.json() as Promise<CmsSiteApiResponse>;
}
