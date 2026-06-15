/**
 * Remove stale bookings from S3 cms/site.json (Postgres is source of truth).
 *
 *   npm run cms:strip-s3-bookings
 */
import { stripBookingsFromCmsSite } from '../lib/cms/s3BookingsExcluded';
import { isBookingsManagedInPostgres } from '../lib/db/config';
import { isS3CmsConfigured, readCmsSiteFromS3, writeCmsSiteToS3 } from '../lib/s3CmsSite';
import { normalizeCmsSite } from '../lib/cmsSiteTypes';

async function main() {
  if (!isS3CmsConfigured()) {
    console.error('S3 CMS is not configured.');
    process.exit(1);
  }
  if (!isBookingsManagedInPostgres()) {
    console.error('Bookings are not managed in Postgres — nothing to strip.');
    process.exit(1);
  }

  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('No cms/site.json in S3.');
    process.exit(1);
  }

  const before = site.bookings.length;
  const stripped = stripBookingsFromCmsSite(site);
  if (before === 0 && stripped.smsJobs.length === 0) {
    console.log('S3 already has no bookings.');
    return;
  }

  await writeCmsSiteToS3(normalizeCmsSite(stripped));
  console.log(`Stripped ${before} booking(s) from S3 cms/site.json.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
