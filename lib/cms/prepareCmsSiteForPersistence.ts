import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { CMS_SITE_VERSION, defaultCmsSite } from '@/lib/cmsSiteTypes';
import { isS3GalleryOnlyStorage, isAdminContentFromPostgres, isAdminSiteConfigFromPostgres, isBookingsManagedInPostgres } from '@/lib/db/config';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

/**
 * Build the in-memory snapshot before S3 write. When Postgres owns site data,
 * only gallery is merged; writeCmsSiteToS3 serializes via toS3CmsDocument.
 */
export async function prepareCmsSiteForPersistence(
  incoming: CmsSitePayload
): Promise<CmsSitePayload> {
  const existing = (await readCmsSiteFromS3()) ?? defaultCmsSite();

  if (isS3GalleryOnlyStorage()) {
    return {
      ...defaultCmsSite(),
      version: incoming.version ?? existing.version ?? CMS_SITE_VERSION,
      gallery: incoming.gallery ?? existing.gallery,
    };
  }

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
