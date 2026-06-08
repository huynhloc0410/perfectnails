import { normalizeCmsSite } from '@/lib/cmsSiteTypes';
import { isS3CmsConfigured, readCmsSiteFromS3, writeCmsSiteToS3 } from '@/lib/s3CmsSite';

/** Keep S3 cmsSite aligned when admin deletes a booking from Postgres. */
export async function removeBookingFromCmsSite(legacyId: string): Promise<void> {
  if (!isS3CmsConfigured()) return;

  const site = await readCmsSiteFromS3();
  if (!site) return;

  const id = legacyId.trim();
  site.bookings = site.bookings.filter((b) => b.id !== id);
  site.smsJobs = [];

  await writeCmsSiteToS3(normalizeCmsSite(site));
}
