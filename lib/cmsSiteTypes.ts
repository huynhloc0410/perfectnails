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
  about: CmsAbout;
  contact: CmsContact;
  /** Public gallery image URLs (same bucket path or CDN as you configure). */
  gallery: string[];
}

export const CMS_SITE_VERSION = 1;

export function defaultCmsSite(): CmsSitePayload {
  return {
    version: CMS_SITE_VERSION,
    services: [],
    employees: [],
    bookings: [],
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

  return {
    version: typeof o.version === 'number' ? o.version : CMS_SITE_VERSION,
    services: Array.isArray(o.services)
      ? o.services.map((x) => normalizeCmsService(x))
      : [],
    employees: Array.isArray(o.employees) ? (o.employees as CmsEmployee[]) : [],
    bookings: Array.isArray(o.bookings) ? (o.bookings as CmsBooking[]) : [],
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
