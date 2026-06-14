import type { CustomerVisitInfo } from '@/lib/cmsSiteTypes';
import { salonAppointmentDate } from '@/lib/db/timezone';
import { phoneDigits10 } from '@/lib/phone';

export function formatSalonDateUs(dt: Date): string {
  const ymd = salonAppointmentDate(dt);
  const [y, m, d] = ymd.split('-');
  return `${m}-${d}-${y}`;
}

type PhoneAgg = { count: number; firstMs: number };

function aggregateByPhone<T extends { phone: string; date: string }>(
  bookings: T[]
): Map<string, PhoneAgg> {
  const byPhone = new Map<string, PhoneAgg>();
  for (const b of bookings) {
    const key = phoneDigits10(b.phone);
    if (key.length < 10) continue;
    const ms = new Date(b.date).getTime();
    if (!Number.isFinite(ms)) continue;
    const cur = byPhone.get(key);
    if (!cur) {
      byPhone.set(key, { count: 1, firstMs: ms });
    } else {
      cur.count += 1;
      if (ms < cur.firstMs) cur.firstMs = ms;
    }
  }
  return byPhone;
}

export function customerVisitInfoForBooking(agg: PhoneAgg, bookingMs: number): CustomerVisitInfo {
  return {
    visitCount: agg.count,
    firstVisitDate: formatSalonDateUs(new Date(agg.firstMs)),
    isReturning: Number.isFinite(bookingMs) && bookingMs > agg.firstMs,
  };
}

/** Attach visit count + first date to each booking (same phone = same customer). */
export function attachCustomerVisitStats<T extends { phone: string; date: string }>(
  bookings: T[]
): Array<T & { customerVisit?: CustomerVisitInfo }> {
  const byPhone = aggregateByPhone(bookings);
  return bookings.map((b) => {
    const key = phoneDigits10(b.phone);
    const agg = key.length >= 10 ? byPhone.get(key) : undefined;
    if (!agg) return b;
    const bookingMs = new Date(b.date).getTime();
    const visit = Number.isFinite(bookingMs)
      ? customerVisitInfoForBooking(agg, bookingMs)
      : {
          visitCount: agg.count,
          firstVisitDate: formatSalonDateUs(new Date(agg.firstMs)),
          isReturning: false,
        };
    return { ...b, customerVisit: visit };
  });
}

export function customerVisitHistoryLabel(visit: CustomerVisitInfo): string {
  const times = visit.visitCount === 1 ? '1 time' : `${visit.visitCount} times`;
  return `First: ${visit.firstVisitDate} / ${times}`;
}
