/**
 * ONE-TIME migration only. Do NOT run on a live Postgres site — bookings are owned by the DB.
 * This reads cms/site.json from S3 and upserts into PostgreSQL (legacy migration path).
 *
 *   npm run db:migrate-from-s3
 *
 * For routine operation with DATABASE_URL set, use Postgres APIs only — not this script.
 */
import { isDatabaseConfigured } from '../lib/db/config';
import { disconnectPgPool } from '../lib/db/pool';
import { syncCmsSiteToPostgres } from '../lib/db/syncCmsSiteToPostgres';
import { isS3CmsConfigured, readCmsSiteFromS3, s3EnvMissingParts } from '../lib/s3CmsSite';

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  if (!isS3CmsConfigured()) {
    console.error('S3 CMS is not configured. Missing:', s3EnvMissingParts().join(', '));
    process.exit(1);
  }

  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('Could not read cmsSite from S3.');
    process.exit(1);
  }

  console.info(
    `Syncing cmsSite → PostgreSQL: ${site.bookings.length} bookings, ${site.services.length} services, ${site.employees.length} employees`
  );

  await syncCmsSiteToPostgres(site);

  console.info('Sync complete.');
}

main()
  .catch((e) => {
    console.error('Sync failed:', e);
    process.exit(1);
  })
  .finally(() => disconnectPgPool());
