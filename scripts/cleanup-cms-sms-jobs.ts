/**
 * Remove smsJobs in S3 whose booking was deleted (orphan reminders).
 *
 * Usage:
 *   export DATABASE_URL=... AWS_*=...
 *   npm run cms:cleanup-sms-jobs
 */
import { normalizeCmsSite } from '../lib/cmsSiteTypes';
import { pruneOrphanSmsJobs } from '../lib/bookingReminderJobs';
import { syncCmsSiteToPostgres } from '../lib/db/syncCmsSiteToPostgres';
import { disconnectPgPool } from '../lib/db/pool';
import { isS3CmsConfigured, readCmsSiteFromS3, s3EnvMissingParts, writeCmsSiteToS3 } from '../lib/s3CmsSite';

async function main(): Promise<void> {
  if (!isS3CmsConfigured()) {
    console.error('S3 not configured. Missing:', s3EnvMissingParts().join(', '));
    process.exit(1);
  }

  const raw = await readCmsSiteFromS3();
  if (!raw) {
    console.error('Could not read cmsSite.');
    process.exit(1);
  }

  const before = raw.smsJobs.length;
  const pruned = pruneOrphanSmsJobs(raw.smsJobs, raw.bookings);
  const removed = before - pruned.length;

  if (removed === 0) {
    console.info(`No orphan smsJobs found (${before} jobs, ${raw.bookings.length} bookings).`);
    return;
  }

  const site = normalizeCmsSite({ ...raw, smsJobs: pruned });
  console.info(
    `Removing ${removed} orphan smsJob(s) (${before} → ${site.smsJobs.length}), ${raw.bookings.length} bookings remain.`
  );

  await writeCmsSiteToS3(site);
  try {
    await syncCmsSiteToPostgres(site);
  } catch (e) {
    console.error('PostgreSQL sync failed (S3 saved):', e);
  }
  console.info('Saved to S3 and synced PostgreSQL.');
}

main()
  .catch((e) => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => disconnectPgPool());
