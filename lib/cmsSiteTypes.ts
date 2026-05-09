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
 * Times are HH:MM 24h. The interval is half-open [startTime, endTime): endTime excludes that minute.
 */
export interface CmsBookingBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  /** If set, applies only to that employee; omit for whole-salon blocks. */
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
  socialMedia: { facebook: string; instagram: string; twitter: string };
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
  /** Public gallery image URLs (same bucket path or CDN as you configure). */
  gallery: string[];
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
      socialMedia: { facebook: '', instagram: '', twitter: '' },
    },
    gallery: [],
  };
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HM_RE = /^(\d{1,2}):(\d{2})$/;

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
  return {
    id,
    date,
    startTime: pad(sh, smin),
    endTime: pad(eh, emin),
    employeeId: employeeRaw || undefined,
  };
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
  const galleryRaw = Array.isArray(o.gallery) ? o.gallery : [];
  const gallery = galleryRaw.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
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
        ? {
            ...base.contact,
            ...(o.contact as CmsContact),
            socialMedia: {
              ...base.contact.socialMedia,
              ...((o.contact as CmsContact).socialMedia || {}),
            },
          }
        : base.contact,
    gallery,
  };
}
