/**
 * Remove bookings and smsJobs keys from S3 cms/site.json (Postgres is source of truth).
 *
 *   npm run cms:strip-s3-bookings
 */
import { toS3CmsDocument } from '../lib/cms/s3CmsDocument';
import { isBookingsManagedInPostgres } from '../lib/db/config';
import { isS3CmsConfigured, readCmsSiteFromS3, writeCmsSiteToS3 } from '../lib/s3CmsSite';

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

  const hadBookings = site.bookings.length > 0;
  await writeCmsSiteToS3(site);
  console.log(
    hadBookings
      ? `Rewrote S3 cms/site.json without bookings/smsJobs keys (had ${site.bookings.length} stale booking(s)).`
      : 'Rewrote S3 cms/site.json without bookings/smsJobs keys.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
