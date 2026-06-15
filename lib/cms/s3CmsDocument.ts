import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { isBookingsManagedInPostgres } from '@/lib/db/config';

/** JSON stored in S3 when Postgres owns bookings — no bookings or smsJobs keys. */
export type S3CmsSiteDocument = Omit<CmsSitePayload, 'bookings' | 'smsJobs'>;

/**
 * Serialize cms/site.json for S3. When Postgres owns bookings, omit those keys entirely
 * so they cannot be merged or synced back into the database.
 */
export function toS3CmsDocument(site: CmsSitePayload): CmsSitePayload | S3CmsSiteDocument {
  if (!isBookingsManagedInPostgres()) return site;
  const { bookings: _b, smsJobs: _s, ...doc } = site;
  return doc;
}

/** API / client payload: same omission as S3 file when Postgres owns bookings. */
export function toCmsSiteApiPayload(site: CmsSitePayload): CmsSitePayload | S3CmsSiteDocument {
  return toS3CmsDocument(site);
}
