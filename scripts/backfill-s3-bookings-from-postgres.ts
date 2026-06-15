/**
 * Emergency one-way backup: copy Postgres bookings into S3 cmsSite (merge).
 * Safe to run — does NOT delete Postgres rows. Use only if you need S3 to mirror PG.
 *
 *   export DATABASE_URL='...'
 *   npm run db:backfill-s3-bookings
 */
import { mergeBookingLists } from '../lib/booking/mergeBookingLists';
import { persistCmsSite } from '../lib/cms/persistCmsSite';
import { isDatabaseConfigured } from '../lib/db/config';
import { listAdminBookingsFromPostgres } from '../lib/db/adminBookings';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '../lib/s3CmsSite';

async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  if (!isS3CmsConfigured()) {
    console.error('S3 CMS is not configured.');
    process.exit(1);
  }

  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('Could not read cms/site.json from S3.');
    process.exit(1);
  }

  const pgBookings = await listAdminBookingsFromPostgres();
  const before = site.bookings.length;
  site.bookings = mergeBookingLists(pgBookings, site.bookings);
  const added = site.bookings.length - before;

  await persistCmsSite(site);
  console.log(`S3 bookings: ${before} → ${site.bookings.length} (+${added} from Postgres).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
