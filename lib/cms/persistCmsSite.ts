import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { syncCmsSiteToPostgres } from '@/lib/db/syncCmsSiteToPostgres';
import { writeCmsSiteToS3 } from '@/lib/s3CmsSite';

/**
 * Save cmsSite JSON to S3 (gallery + legacy blob). Postgres sync is limited:
 * - Bookings / scheduling already in Postgres are NOT overwritten from S3.
 * - Gallery images still dual-write to Postgres when CMS_WRITE_DB is on.
 */
export async function persistCmsSite(site: CmsSitePayload): Promise<void> {
  await writeCmsSiteToS3(site);
  try {
    await syncCmsSiteToPostgres(site);
  } catch (e) {
    console.error('PostgreSQL dual-write failed (S3 saved successfully):', e);
  }
}
