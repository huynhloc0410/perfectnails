import { salonDayOfWeekFromYmd, salonMinutesSinceMidnight } from '@/lib/db/timezone';

export type BusinessHours = { openMinutes: number; closeMinutes: number };

/** Monday–Friday: 9:30 AM–7:00 PM; Saturday: 9:30 AM–6:00 PM; Sunday closed (Arizona). */
export function getBusinessHoursForDateYmd(dateYmd: string): BusinessHours | null {
  const dow = salonDayOfWeekFromYmd(dateYmd);
  if (dow === null) return null;
  if (dow === 0) return null; // Sunday closed
  const openMinutes = 9 * 60 + 30;
  // Saturday closes 6:00 PM; weekdays close 7:00 PM.
  const closeMinutes = dow === 6 ? 18 * 60 : 19 * 60;
  return { openMinutes, closeMinutes };
}

export function isWithinBusinessHours(
  dateYmd: string,
  slotStart: Date,
  durationMinutes: number,
): boolean {
  const hours = getBusinessHoursForDateYmd(dateYmd);
  if (!hours) return false;
  const startMinutes = salonMinutesSinceMidnight(slotStart);
  const endMinutes = startMinutes + durationMinutes;
  return startMinutes >= hours.openMinutes && endMinutes <= hours.closeMinutes;
}
