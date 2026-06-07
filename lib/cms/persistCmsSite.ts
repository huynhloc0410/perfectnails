import type { CmsSitePayload } from '@/lib/cmsSiteTypes';
import { syncCmsSiteToPostgres } from '@/lib/db/syncCmsSiteToPostgres';
import { writeCmsSiteToS3 } from '@/lib/s3CmsSite';

/**
 * Persist cmsSite: S3 first (required), PostgreSQL second (best-effort dual-write).
 * Reads continue from S3 until CMS_READ_SOURCE=postgres is enabled.
 */
export async function persistCmsSite(site: CmsSitePayload): Promise<void> {
  await writeCmsSiteToS3(site);
  try {
    await syncCmsSiteToPostgres(site);
  } catch (e) {
    console.error('PostgreSQL dual-write failed (S3 saved successfully):', e);
  }
}
