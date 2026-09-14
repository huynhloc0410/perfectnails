import { salonAppointmentDate, salonDateTimeToUtc } from '@/lib/db/timezone';

/** Minimum advance notice for appointments (from “now” to slot start). */
export const MIN_BOOKING_NOTICE_MINUTES = 30;

/** Public booking grid step; must stay aligned with slot generation. */
export const BOOKING_SLOT_STEP_MINUTES = 30;

/**
 * Public online booking horizon: today through 2 calendar months (~60 days).
 * Example: 14 Sep → last selectable day is 14 Nov (clamped if the target month is shorter).
 */
export const BOOKING_MAX_ADVANCE_MONTHS = 2;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Add calendar months, clamping the day when the target month is shorter (e.g. 31 Jan → 28/29 Feb). */
export function addCalendarMonths(date: Date, months: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const day = date.getDate();
  const lastDay = new Date(y, m + months + 1, 0).getDate();
  const next = new Date(y, m + months, Math.min(day, lastDay));
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addCalendarMonthsToYmd(ymd: string, months: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const next = new Date(Date.UTC(y, m - 1 + months, day));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

export function getLatestBookableCalendarDate(now: Date = new Date()): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return addCalendarMonths(today, BOOKING_MAX_ADVANCE_MONTHS);
}

export function getLatestBookableYmd(now: Date = new Date()): string {
  const todayYmd = salonAppointmentDate(now);
  return addCalendarMonthsToYmd(todayYmd, BOOKING_MAX_ADVANCE_MONTHS) ?? todayYmd;
}

export function isCalendarDateWithinPublicBookingHorizon(date: Date, now: Date = new Date()): boolean {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const maxDate = getLatestBookableCalendarDate(now);
  return d.getTime() >= today.getTime() && d.getTime() <= maxDate.getTime();
}

export function isYmdWithinPublicBookingHorizon(dateYmd: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return false;
  const todayYmd = salonAppointmentDate(now);
  const maxYmd = getLatestBookableYmd(now);
  return dateYmd >= todayYmd && dateYmd <= maxYmd;
}

/** Round up to the next slot boundary on the salon (Phoenix) clock. */
function ceilSalonInstantToSlotInterval(instant: Date, stepMinutes: number): Date {
  const stepMs = stepMinutes * 60 * 1000;
  const dateYmd = salonAppointmentDate(instant);
  const midnight = salonDateTimeToUtc(dateYmd, '00:00');
  if (!midnight) return instant;
  const msIntoDay = instant.getTime() - midnight.getTime();
  const ceiledIntoDay = Math.ceil(msIntoDay / stepMs) * stepMs;
  return new Date(midnight.getTime() + ceiledIntoDay);
}

/**
 * Minimum allowed slot start: current time + notice, rounded UP to the next slot boundary (Phoenix).
 *
 * Example: now 12:21 + 30min → 12:51 → next 30-min slot → 13:00 (Arizona time).
 */
export function getEarliestBookableSlotStart(
  now: Date,
  options?: { noticeMinutes?: number; slotStepMinutes?: number }
): Date {
  const noticeMinutes = options?.noticeMinutes ?? MIN_BOOKING_NOTICE_MINUTES;
  const slotStepMinutes = options?.slotStepMinutes ?? BOOKING_SLOT_STEP_MINUTES;
  const afterNotice = new Date(now.getTime() + noticeMinutes * 60 * 1000);
  return ceilSalonInstantToSlotInterval(afterNotice, slotStepMinutes);
}

export function isSlotStartAllowedForBooking(
  slotStartLocal: Date,
  now: Date,
  options?: { noticeMinutes?: number; slotStepMinutes?: number }
): boolean {
  const earliest = getEarliestBookableSlotStart(now, options).getTime();
  return slotStartLocal.getTime() >= earliest;
}
