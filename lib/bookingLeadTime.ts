import { salonAppointmentDate, salonDateTimeToUtc } from '@/lib/db/timezone';

/** Minimum advance notice for appointments (from “now” to slot start). */
export const MIN_BOOKING_NOTICE_MINUTES = 30;

/** Public booking grid step; must stay aligned with slot generation. */
export const BOOKING_SLOT_STEP_MINUTES = 30;

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
