import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import {
  isAdminContentFromPostgres,
  isAdminSiteConfigFromPostgres,
  isBookingsManagedInPostgres,
} from '@/lib/db/config';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

/**
 * Build the in-memory snapshot before S3 write. Bookings/smsJobs are omitted from the
 * S3 JSON file by writeCmsSiteToS3 → toS3CmsDocument when Postgres owns bookings.
 */
export async function prepareCmsSiteForPersistence(
  incoming: CmsSitePayload
): Promise<CmsSitePayload> {
  const existing = (await readCmsSiteFromS3()) ?? incoming;
  const schedulingInPg = isAdminSiteConfigFromPostgres();
  const bookingsInPg = isBookingsManagedInPostgres();
  const contentInPg = isAdminContentFromPostgres();

  return {
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
}
