const SALON_TIMEZONE = 'America/Phoenix';

/**
 * Arizona (America/Phoenix) does not observe DST — always MST (UTC−7).
 * Use this when building absolute instants from salon calendar date + HH:MM
 * so Node/server UTC and browser Phoenix agree.
 */
const SALON_UTC_OFFSET = '-07:00';

/**
 * Interpret YYYY-MM-DD + HH:MM as salon wall time → absolute Date.
 * Safe on UTC servers (unlike `new Date(y, m, d, h, min)`).
 */
export function salonDateTimeToUtc(dateYmd: string, hm: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm ?? '').trim());
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const iso = `${dateYmd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000${SALON_UTC_OFFSET}`;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Wall-clock hour/minute in salon timezone (Arizona). */
export function salonWallClock(dt: Date): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SALON_TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(dt);

  let hours = 0;
  let minutes = 0;
  for (const p of parts) {
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
  }
  return { hours, minutes };
}

/** HH:MM for admin booking rows (matches cmsSite timeSlot). */
export function salonTimeSlotLabel(dt: Date): string {
  const { hours, minutes } = salonWallClock(dt);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** YYYY-MM-DD in salon timezone for bookings.appointment_date. */
export function salonAppointmentDate(dt: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
}
