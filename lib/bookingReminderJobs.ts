import type { CmsBooking, CmsSmsJob } from '@/lib/cmsSiteTypes';

const MS_PER_HOUR = 60 * 60 * 1000;

/** Hours before appointment to send reminder SMS (skipped if send time is already past). */
export const BOOKING_REMINDER_HOURS_BEFORE = [24, 2] as const;

export type BookingReminderHoursBefore = (typeof BOOKING_REMINDER_HOURS_BEFORE)[number];

export function reminderJobId(bookingId: string, hoursBefore: BookingReminderHoursBefore): string {
  return `${bookingId}:reminder:${hoursBefore}h`;
}

/** Parse lead time from job id (`:reminder:24h`, `:reminder:2h`, or legacy `:reminder`). */
export function parseReminderHoursBefore(jobId: string): BookingReminderHoursBefore | null {
  const m = /:reminder:(\d+)h$/.exec(jobId);
  if (m) {
    const h = parseInt(m[1], 10);
    if (h === 24 || h === 2) return h;
  }
  if (jobId.endsWith(':reminder')) return 2;
  return null;
}

/**
 * Queue 24h and 2h reminder jobs. Skips any whose send time is not in the future
 * (e.g. booking under 2h out skips the 2h reminder; under 24h out skips the 24h reminder).
 */
export function buildBookingReminderJobs(params: {
  bookingId: string;
  phoneE164: string;
  appointmentAt: Date;
  now: Date;
}): CmsSmsJob[] {
  const { bookingId, phoneE164, appointmentAt, now } = params;
  const createdAt = now.toISOString();
  const jobs: CmsSmsJob[] = [];

  for (const hoursBefore of BOOKING_REMINDER_HOURS_BEFORE) {
    const sendAt = new Date(appointmentAt.getTime() - hoursBefore * MS_PER_HOUR);
    if (sendAt.getTime() <= now.getTime()) continue;

    jobs.push({
      id: reminderJobId(bookingId, hoursBefore),
      kind: 'booking_reminder',
      status: 'pending',
      to: phoneE164,
      bookingId,
      sendAt: sendAt.toISOString(),
      createdAt,
      updatedAt: createdAt,
    });
  }

  return jobs;
}

/** Drop reminder/confirmation jobs tied to a deleted booking. */
export function removeSmsJobsForBooking(smsJobs: CmsSmsJob[], bookingId: string): CmsSmsJob[] {
  const id = bookingId.trim();
  if (!id) return smsJobs;
  return smsJobs.filter((j) => {
    if (j.bookingId === id) return false;
    if (j.id.startsWith(`${id}:`)) return false;
    return true;
  });
}

/** Remove smsJobs whose bookingId (or reminder id prefix) no longer exists in bookings. */
export function pruneOrphanSmsJobs(smsJobs: CmsSmsJob[], bookings: CmsBooking[]): CmsSmsJob[] {
  const bookingIds = new Set(bookings.map((b) => b.id));
  return smsJobs.filter((j) => {
    if (j.bookingId && !bookingIds.has(j.bookingId)) return false;
    if (j.kind === 'booking_reminder') {
      const bid = j.bookingId ?? j.id.split(':reminder:')[0];
      if (bid && !bookingIds.has(bid)) return false;
    }
    return true;
  });
}
