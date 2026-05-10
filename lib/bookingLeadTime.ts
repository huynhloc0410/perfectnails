/** Minimum advance notice for appointments (from “now” to slot start). */
export const MIN_BOOKING_NOTICE_MINUTES = 30;

/** Public booking grid step; must stay aligned with slot generation. */
export const BOOKING_SLOT_STEP_MINUTES = 30;

function ceilLocalInstantToSlotInterval(instant: Date, stepMinutes: number): Date {
  const stepMs = stepMinutes * 60 * 1000;
  const y = instant.getFullYear();
  const mo = instant.getMonth();
  const d = instant.getDate();
  const startOfDay = new Date(y, mo, d, 0, 0, 0, 0);
  const msIntoDay = instant.getTime() - startOfDay.getTime();
  const ceiledIntoDay = Math.ceil(msIntoDay / stepMs) * stepMs;
  return new Date(startOfDay.getTime() + ceiledIntoDay);
}

/**
 * Minimum allowed slot start: current time + notice, rounded UP to the next slot boundary (local TZ).
 *
 * Example: now 12:21 + 30min → 12:51 → next 30-min slot → 13:00.
 */
export function getEarliestBookableSlotStart(
  now: Date,
  options?: { noticeMinutes?: number; slotStepMinutes?: number }
): Date {
  const noticeMinutes = options?.noticeMinutes ?? MIN_BOOKING_NOTICE_MINUTES;
  const slotStepMinutes = options?.slotStepMinutes ?? BOOKING_SLOT_STEP_MINUTES;
  const afterNotice = new Date(now.getTime() + noticeMinutes * 60 * 1000);
  return ceilLocalInstantToSlotInterval(afterNotice, slotStepMinutes);
}

export function isSlotStartAllowedForBooking(
  slotStartLocal: Date,
  now: Date,
  options?: { noticeMinutes?: number; slotStepMinutes?: number }
): boolean {
  const earliest = getEarliestBookableSlotStart(now, options).getTime();
  return slotStartLocal.getTime() >= earliest;
}
