/**
 * Normalize booking start time for grouping (same wall-clock start → same row).
 */

export function getBookingStartMinutes(booking: { date: string; timeSlot?: string }): number {
  const ts = (booking.timeSlot ?? '').trim();

  const m24 = /^(\d{1,2}):(\d{2})$/.exec(ts);
  if (m24) {
    const hh = parseInt(m24[1], 10);
    const mm = parseInt(m24[2], 10);
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }

  const m12 = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(ts);
  if (m12) {
    let hh = parseInt(m12[1], 10);
    const mm = parseInt(m12[2], 10);
    const ap = m12[3].toLowerCase();
    if (ap === 'pm' && hh < 12) hh += 12;
    if (ap === 'am' && hh === 12) hh = 0;
    if (hh >= 0 && hh < 24 && mm >= 0 && mm < 60) return hh * 60 + mm;
  }

  const dt = new Date(booking.date);
  if (!Number.isNaN(dt.getTime())) {
    return dt.getHours() * 60 + dt.getMinutes();
  }

  return 0;
}

export function formatMinutesAsTimeLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const d = new Date(2000, 0, 1, h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export type BookingTimeGroup<T> = {
  minutes: number;
  label: string;
  bookings: T[];
};

export function groupBookingsByStartTime<T extends { date: string; timeSlot?: string; name: string }>(
  list: T[],
): BookingTimeGroup<T>[] {
  const map = new Map<number, T[]>();
  for (const b of list) {
    const m = getBookingStartMinutes(b);
    const arr = map.get(m);
    if (arr) arr.push(b);
    else map.set(m, [b]);
  }
  const keys = Array.from(map.keys()).sort((a, b) => a - b);
  return keys.map((minutes) => {
    const bookings = map.get(minutes)!;
    bookings.sort((a, b) => a.name.localeCompare(b.name));
    return {
      minutes,
      label: formatMinutesAsTimeLabel(minutes),
      bookings,
    };
  });
}
