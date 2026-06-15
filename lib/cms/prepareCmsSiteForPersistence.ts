import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import {
  isAdminContentFromPostgres,
  isAdminSiteConfigFromPostgres,
  isBookingsManagedInPostgres,
} from '@/lib/db/config';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

/**
 * Build the S3 snapshot to write. When Postgres owns bookings/scheduling/content,
 * do not let a gallery-only (or stale) client payload overwrite those fields in S3.
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
    bookings: bookingsInPg ? existing.bookings : incoming.bookings,
    about: contentInPg ? existing.about : incoming.about,
    contact: contentInPg ? existing.contact : incoming.contact,
  };
}
