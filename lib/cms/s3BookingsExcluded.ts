import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { isBookingsManagedInPostgres } from '@/lib/db/config';

/** S3 cms/site.json must not store bookings when Postgres owns them. */
export function stripBookingsFromCmsSite(site: CmsSitePayload): CmsSitePayload {
  if (!isBookingsManagedInPostgres()) return site;
  return {
    ...site,
    bookings: [],
    smsJobs: [],
  };
}
