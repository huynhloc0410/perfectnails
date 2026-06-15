import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import {
  isAdminContentFromPostgres,
  isAdminSiteConfigFromPostgres,
  isBookingsManagedInPostgres,
} from '@/lib/db/config';
import { stripBookingsFromCmsSite } from '@/lib/cms/s3BookingsExcluded';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

/**
 * Build the S3 snapshot to write. Postgres-owned sections are not stored in S3;
 * gallery is the primary S3 payload when DATABASE_URL is set.
 */
export async function prepareCmsSiteForPersistence(
  incoming: CmsSitePayload
): Promise<CmsSitePayload> {
  const existing = (await readCmsSiteFromS3()) ?? incoming;
  const schedulingInPg = isAdminSiteConfigFromPostgres();
  const bookingsInPg = isBookingsManagedInPostgres();
  const contentInPg = isAdminContentFromPostgres();

  const snapshot: CmsSitePayload = {
    ...existing,
    version: incoming.version ?? existing.version,
    gallery: incoming.gallery ?? existing.gallery,
    smsJobs: [],
    services: schedulingInPg ? existing.services : incoming.services,
    employees: schedulingInPg ? existing.employees : incoming.employees,
    bookingBlocks: schedulingInPg ? existing.bookingBlocks : incoming.bookingBlocks,
    bookings: bookingsInPg ? [] : incoming.bookings,
    about: contentInPg ? existing.about : incoming.about,
    contact: contentInPg ? existing.contact : incoming.contact,
  };

  return stripBookingsFromCmsSite(snapshot);
}
