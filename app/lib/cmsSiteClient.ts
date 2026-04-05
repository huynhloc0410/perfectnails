/** Client fetch for GET /api/cms/site (public). */

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
  const r = await fetch('/api/cms/site', { credentials: 'same-origin' });
  return r.json() as Promise<CmsSiteApiShape>;
}
