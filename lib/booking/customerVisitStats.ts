import type { CustomerVisitDay, CustomerVisitInfo } from '@/lib/cmsSiteTypes';
import { salonAppointmentDate } from '@/lib/db/timezone';
import { phoneDigits10 } from '@/lib/phone';

export function formatSalonDateUs(dt: Date): string {
  const ymd = salonAppointmentDate(dt);
  return formatYmdUs(ymd);
}

function formatYmdUs(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${m}-${d}-${y}`;
}

type DayAgg = {
  ymd: string;
  firstMs: number;
  clientNames: string[];
  services: string[];
};

type PhoneAgg = {
  days: Map<string, DayAgg>;
};

type BookingLike = {
  phone: string;
  date: string;
  name?: string;
  service?: string;
};

function pushUnique(list: string[], value: string | undefined) {
  const t = String(value ?? '').trim();
  if (!t || list.includes(t)) return;
  list.push(t);
}

function aggregateByPhone(bookings: BookingLike[]): Map<string, PhoneAgg> {
  const byPhone = new Map<string, PhoneAgg>();

  for (const b of bookings) {
    const key = phoneDigits10(b.phone);
    if (key.length < 10) continue;
    const dt = new Date(b.date);
    const ms = dt.getTime();
    if (!Number.isFinite(ms)) continue;
    const ymd = salonAppointmentDate(dt);

    let phoneAgg = byPhone.get(key);
    if (!phoneAgg) {
      phoneAgg = { days: new Map() };
      byPhone.set(key, phoneAgg);
    }

    let day = phoneAgg.days.get(ymd);
    if (!day) {
      day = { ymd, firstMs: ms, clientNames: [], services: [] };
      phoneAgg.days.set(ymd, day);
    } else if (ms < day.firstMs) {
      day.firstMs = ms;
    }

    pushUnique(day.clientNames, b.name);
    pushUnique(day.services, b.service);
  }

  return byPhone;
}

function dayToVisitDay(day: DayAgg): CustomerVisitDay {
  return {
    date: formatYmdUs(day.ymd),
    clientNames: [...day.clientNames],
    services: [...day.services],
  };
}

function sortedDays(agg: PhoneAgg): DayAgg[] {
  return Array.from(agg.days.values()).sort((a, b) => a.ymd.localeCompare(b.ymd));
}

export function customerVisitInfoForBooking(agg: PhoneAgg, bookingYmd: string): CustomerVisitInfo {
  const days = sortedDays(agg);
  const first = days[0];
  const recent = days.slice(-3).reverse(); // most recent first in data; UI may re-order

  return {
    visitCount: days.length,
    firstVisitDate: formatYmdUs(first.ymd),
    isReturning: Boolean(bookingYmd && bookingYmd > first.ymd),
    firstVisit: dayToVisitDay(first),
    recentVisits: recent.map(dayToVisitDay),
  };
}

/** Attach visit count + first/recent days to each booking (same phone = same customer). */
export function attachCustomerVisitStats<T extends BookingLike>(
  bookings: T[]
): Array<T & { customerVisit?: CustomerVisitInfo }> {
  const byPhone = aggregateByPhone(bookings);
  return bookings.map((b) => {
    const key = phoneDigits10(b.phone);
    const agg = key.length >= 10 ? byPhone.get(key) : undefined;
    if (!agg || agg.days.size === 0) return b;

    const dt = new Date(b.date);
    const bookingYmd = Number.isFinite(dt.getTime()) ? salonAppointmentDate(dt) : '';
    return { ...b, customerVisit: customerVisitInfoForBooking(agg, bookingYmd) };
  });
}

/** Visit days for the Old badge: first day, then last 3 days without duplicating first. */
export function customerVisitHistoryDays(visit: CustomerVisitInfo): {
  first: CustomerVisitDay;
  recent: CustomerVisitDay[];
} {
  const recent = [...visit.recentVisits]
    .filter((d) => d.date !== visit.firstVisit.date)
    .sort((a, b) => {
      // MM-DD-YYYY → compare via parts as chronological ascending
      const [am, ad, ay] = a.date.split('-').map(Number);
      const [bm, bd, by] = b.date.split('-').map(Number);
      return ay - by || am - bm || ad - bd;
    });

  return { first: visit.firstVisit, recent };
}
