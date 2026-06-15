import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { prepareCmsSiteForPersistence } from '@/lib/cms/prepareCmsSiteForPersistence';
import { syncCmsSiteToPostgres } from '@/lib/db/syncCmsSiteToPostgres';
import { writeCmsSiteToS3 } from '@/lib/s3CmsSite';

/**
 * Save gallery (and legacy cms/site.json blob) to S3.
 * Postgres sync is limited — see syncCmsSiteToPostgres (bookings/scheduling are not overwritten from S3).
 */
export async function persistCmsSite(incoming: CmsSitePayload): Promise<void> {
  const snapshot = await prepareCmsSiteForPersistence(incoming);
  await writeCmsSiteToS3(snapshot);
  try {
    await syncCmsSiteToPostgres(snapshot);
  } catch (e) {
    console.error('PostgreSQL gallery sync failed (S3 saved successfully):', e);
  }
}
