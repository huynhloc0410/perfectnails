import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { mergeBookingLists } from '@/lib/booking/mergeBookingLists';
import { isDatabaseConfigured } from '@/lib/db/config';
import { listAdminBookingsFromPostgres } from '@/lib/db/adminBookings';
import { syncCmsSiteToPostgres } from '@/lib/db/syncCmsSiteToPostgres';
import { writeCmsSiteToS3 } from '@/lib/s3CmsSite';

/**
 * Persist cmsSite: S3 first (required), PostgreSQL second (best-effort dual-write).
 * Merges Postgres bookings into the snapshot so sync never drops DB-only appointments.
 */
export async function persistCmsSite(site: CmsSitePayload): Promise<void> {
  let snapshot = site;
  if (isDatabaseConfigured()) {
    try {
      const pgBookings = await listAdminBookingsFromPostgres();
      snapshot = { ...site, bookings: mergeBookingLists(pgBookings, site.bookings) };
    } catch (e) {
      console.error('Could not merge Postgres bookings into cmsSite snapshot:', e);
    }
  }

  await writeCmsSiteToS3(snapshot);
  try {
    await syncCmsSiteToPostgres(snapshot);
  } catch (e) {
    console.error('PostgreSQL dual-write failed (S3 saved successfully):', e);
  }
}
