import { normalizeContactSocialMedia } from '@/lib/site/contact';

export interface CmsService {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  duration: number;
}

export interface CmsEmployee {
  id: string;
  name: string;
  role: 'Water' | 'Powder' | 'Everything';
  phone: string;
}

export interface CmsBooking {
  id: string;
  name: string;
  phone: string;
  service: string;
  employee?: string;
  date: string;
  timeSlot: string;
  duration: number;
}

/**
 * Block online booking for a window on one calendar day (salon-local date).
 * Times are HH:MM 24h. Uses half-open [startTime, endTime): the start of endTime is the first instant that is allowed again.
 */
export interface CmsBookingBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  /** true = every technician (and "Anyone"); false = only `employeeId`. */
  salonWide: boolean;
  /** Required when salonWide is false */
  employeeId?: string;
}

export type CmsSmsJobKind = 'booking_confirmation' | 'booking_reminder';
export type CmsSmsJobStatus = 'pending' | 'sent' | 'error';

export interface CmsSmsJob {
  id: string;
  kind: CmsSmsJobKind;
  status: CmsSmsJobStatus;
  /** E.164 formatted phone number (e.g. +16233022156). */
  to: string;
  bookingId?: string;
  /** When to send (ISO). */
  sendAt: string;
  /** When actually sent (ISO). */
  sentAt?: string;
  /** Twilio SID for the message, if available. */
  messageSid?: string;
  /** Last error string (safe to log). */
  lastError?: string;
  updatedAt: string;
  createdAt: string;
}

export interface CmsAbout {
  title: string;
  content: string;
}

export interface CmsContact {
  address: string;
  phone: string;
  email: string;
  hours: string;
  socialMedia: { facebook: string; instagram: string; yelp: string };
}

/** Gallery entry: full-size original + WebP thumbnail for grid. */
export type CmsGalleryImage = {
  full: string;
  thumb: string;
};

export function normalizeCmsGalleryItem(raw: unknown): CmsGalleryImage | null {
  if (typeof raw === 'string') {
    const full = raw.trim();
    if (!full) return null;
    return { full, thumb: full };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const full = String(o.full ?? o.url ?? '').trim();
    if (!full) return null;
    const thumb = String(o.thumb ?? '').trim() || full;
    return { full, thumb };
  }
  return null;
}

export function normalizeCmsGalleryList(raw: unknown): CmsGalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCmsGalleryItem).filter((x): x is CmsGalleryImage => x !== null);
}

export interface CmsSitePayload {
  version: number;
  services: CmsService[];
  employees: CmsEmployee[];
  bookings: CmsBooking[];
  /**
   * Server-only SMS queue for reminders/confirmations.
   * Not used by the public UI; stored here for a lightweight persistence layer.
   */
  smsJobs: CmsSmsJob[];
  about: CmsAbout;
  contact: CmsContact;
  /** Gallery images: `full` for lightbox, `thumb` (WebP) for grid. */
  gallery: CmsGalleryImage[];
  /** Unbookable intervals shown on the public booking page (and enforced on POST /api/booking). */
  bookingBlocks: CmsBookingBlock[];
}

export const CMS_SITE_VERSION = 1;

export function defaultCmsSite(): CmsSitePayload {
  return {
    version: CMS_SITE_VERSION,
    services: [],
    employees: [],
    bookings: [],
    bookingBlocks: [],
    smsJobs: [],
    about: { title: '', content: '' },
    contact: {
      address: '',
      phone: '',
      email: '',
      hours: '',
      socialMedia: { facebook: '', instagram: '', yelp: '' },
    },
    gallery: [],
  };
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Supports optional seconds (`HH:MM` or `HH:MM:SS`) from some clients. */
const HM_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function normalizeCmsBookingBlock(raw: unknown): CmsBookingBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? '').trim();
  const date = String(o.date ?? '').trim();
  const startTime = String(o.startTime ?? '').trim();
  const endTime = String(o.endTime ?? '').trim();
  const employeeRaw = o.employeeId != null ? String(o.employeeId).trim() : '';
  if (!id || !YMD_RE.test(date)) return null;
  const sm = HM_RE.exec(startTime);
  const em = HM_RE.exec(endTime);
  if (!sm || !em) return null;
  const sh = parseInt(sm[1], 10);
  const smin = parseInt(sm[2], 10);
  const eh = parseInt(em[1], 10);
  const emin = parseInt(em[2], 10);
  if ([sh, smin, eh, emin].some((n) => !Number.isFinite(n))) return null;
  if (sh < 0 || sh > 23 || smin < 0 || smin > 59) return null;
  if (eh < 0 || eh > 23 || emin < 0 || emin > 59) return null;
  const startM = sh * 60 + smin;
  const endM = eh * 60 + emin;
  if (endM <= startM) return null;
  const pad = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  const scopeRaw = typeof o.scope === 'string' ? o.scope.trim().toLowerCase() : '';
  const salonScope = scopeRaw === 'salon' || scopeRaw === 'whole_salon' || scopeRaw === 'all';
  const stylistScope =
    scopeRaw === 'stylist' || scopeRaw === 'employee' || scopeRaw === 'tech';

  const swRaw = o.salonWide;
  const swTruthy =
    swRaw === true ||
    swRaw === 1 ||
    swRaw === '1' ||
    (typeof swRaw === 'string' && ['true', 'yes', 'all'].includes(swRaw.trim().toLowerCase()));
  const swFalsey =
    swRaw === false ||
    swRaw === 0 ||
    (typeof swRaw === 'string' && ['false', 'no', '0'].includes(swRaw.trim().toLowerCase()));

  let salonWide: boolean;
  if (swTruthy || salonScope) {
    salonWide = true;
  } else if (swFalsey || stylistScope) {
    salonWide = false;
  } else {
    salonWide = !employeeRaw;
  }

  if (!salonWide && !employeeRaw) return null;

  return {
    id,
    date,
    startTime: pad(sh, smin),
    endTime: pad(eh, emin),
    salonWide,
    employeeId: salonWide ? undefined : employeeRaw,
  };
}

export function coerceBookingBlocksList(rawList: unknown[] | undefined): CmsBookingBlock[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeCmsBookingBlock).filter((b): b is CmsBookingBlock => b !== null);
}

function num(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = parseFloat(String(raw ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

function intDur(raw: unknown, fallback: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Coerce Mongo/JSON quirks so category and numbers survive round-trip. */
export function normalizeCmsService(raw: unknown): CmsService {
  if (!raw || typeof raw !== 'object') {
    return {
      id: '',
      name: '',
      description: '',
      price: 0,
      category: '',
      duration: 45,
    };
  }
  const s = raw as Record<string, unknown>;
  return {
    id: String(s.id ?? ''),
    name: String(s.name ?? ''),
    description: String(s.description ?? ''),
    price: num(s.price, 0),
    category: String(s.category ?? '').trim(),
    duration: intDur(s.duration, 45),
  };
}

export function normalizeCmsSite(raw: unknown): CmsSitePayload {
  const base = defaultCmsSite();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const gallery = normalizeCmsGalleryList(o.gallery);
  const bookingBlocksRaw = Array.isArray(o.bookingBlocks) ? o.bookingBlocks : [];
  const bookingBlocks = bookingBlocksRaw
    .map((x) => normalizeCmsBookingBlock(x))
    .filter((b): b is CmsBookingBlock => b !== null);
  const smsJobsRaw = Array.isArray(o.smsJobs) ? o.smsJobs : [];
  const smsJobs = smsJobsRaw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((j) => ({
      id: String(j.id ?? ''),
      kind:
        j.kind === 'booking_confirmation' || j.kind === 'booking_reminder'
          ? (j.kind as CmsSmsJobKind)
          : 'booking_reminder',
      status: j.status === 'pending' || j.status === 'sent' || j.status === 'error' ? (j.status as CmsSmsJobStatus) : 'pending',
      to: String(j.to ?? ''),
      bookingId: j.bookingId != null ? String(j.bookingId) : undefined,
      sendAt: String(j.sendAt ?? ''),
      sentAt: j.sentAt != null ? String(j.sentAt) : undefined,
      messageSid: j.messageSid != null ? String(j.messageSid) : undefined,
      lastError: j.lastError != null ? String(j.lastError) : undefined,
      updatedAt: String(j.updatedAt ?? ''),
      createdAt: String(j.createdAt ?? ''),
    }))
    .filter((j) => j.id && j.to && j.sendAt);

  return {
    version: typeof o.version === 'number' ? o.version : CMS_SITE_VERSION,
    services: Array.isArray(o.services)
      ? o.services.map((x) => normalizeCmsService(x))
      : [],
    employees: Array.isArray(o.employees) ? (o.employees as CmsEmployee[]) : [],
    bookings: Array.isArray(o.bookings) ? (o.bookings as CmsBooking[]) : [],
    bookingBlocks,
    smsJobs,
    about:
      o.about && typeof o.about === 'object'
        ? { ...base.about, ...(o.about as CmsAbout) }
        : base.about,
    contact:
      o.contact && typeof o.contact === 'object'
        ? (() => {
            const oc = o.contact as Record<string, unknown>;
            return {
              address: String(oc.address ?? base.contact.address),
              phone: String(oc.phone ?? base.contact.phone),
              email: String(oc.email ?? base.contact.email),
              hours: String(oc.hours ?? base.contact.hours),
              socialMedia: normalizeContactSocialMedia(oc.socialMedia),
            };
          })()
        : base.contact,
    gallery,
  };
}
