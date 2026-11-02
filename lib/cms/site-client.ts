/**
 * Browser fetches for booking (live slots) and any legacy caller.
 * Home, services, about, contact, and gallery are rendered on the server
 * from getPublicPageSnapshot — they do not use these helpers.
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

/** Services, employees, and blocks for the booking page. Occupancy is loaded per day. */
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

export type BookingDaySlot = {
  id: string;
  service: string;
  employee?: string;
  date: string;
  timeSlot: string;
  duration?: number;
};

/** Occupancy for one salon day: time, employee, duration, and service only. */
export async function fetchBookingDaySlots(dateYmd: string): Promise<BookingDaySlot[]> {
  const r = await fetch(`/api/booking/day?date=${encodeURIComponent(dateYmd)}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = (await r.json().catch(() => null)) as { bookings?: unknown[] } | null;
  if (!r.ok || !data || !Array.isArray(data.bookings)) {
    throw new Error('day_slots_failed');
  }
  const slots: BookingDaySlot[] = [];
  for (const raw of data.bookings) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    if (!id) continue;
    const employee = String(row.employee ?? '').trim();
    const duration = Number(row.duration);
    slots.push({
      id,
      service: String(row.service ?? '').trim() || 'Appointment',
      ...(employee ? { employee } : {}),
      date: String(row.date ?? ''),
      timeSlot: String(row.timeSlot ?? ''),
      ...(Number.isFinite(duration) && duration > 0 ? { duration } : {}),
    });
  }
  return slots;
}
