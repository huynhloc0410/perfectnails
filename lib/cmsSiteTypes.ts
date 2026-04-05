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
  };
}

export function normalizeCmsSite(raw: unknown): CmsSitePayload {
  const base = defaultCmsSite();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    version: typeof o.version === 'number' ? o.version : CMS_SITE_VERSION,
    services: Array.isArray(o.services) ? (o.services as CmsService[]) : [],
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
  };
}
