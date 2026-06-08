/**
 * One-shot sync: read cmsSite from S3 → write full snapshot to PostgreSQL.
 * Use after deleting bookings in admin so PG matches S3.
 *
 * Usage:
 *   export DATABASE_URL='postgresql://...'
 *   export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_S3_BUCKET_NAME=...
 *   npm run db:sync-from-s3
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
