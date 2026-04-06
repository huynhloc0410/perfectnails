/** Client fetch for GET /api/cms/site (public). */

/** Fire on `window` after admin saves (localStorage or S3) so footer/contact UIs can refetch. */
export const SITE_DATA_UPDATED_EVENT = 'perfectnails-site-updated';

export interface CmsSiteApiShape {
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
      socialMedia?: { facebook?: string; instagram?: string; twitter?: string };
    };
    gallery?: string[];
  };
  error?: string;
}

export async function fetchCmsSite(): Promise<CmsSiteApiShape> {
  const r = await fetch('/api/cms/site', {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return r.json() as Promise<CmsSiteApiShape>;
}
