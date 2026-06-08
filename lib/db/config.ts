import { runtimeEnv } from '@/lib/runtimeEnv';

/** True when DATABASE_URL is set at runtime. */
export function isDatabaseConfigured(): boolean {
  const url = runtimeEnv('DATABASE_URL');
  return !!url && url.trim().length > 0;
}

/** Dual-write to Postgres when DATABASE_URL is set. Set CMS_WRITE_DB=false to disable. */
export function isDualWriteToDbEnabled(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_WRITE_DB')?.trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  return true;
}

/**
 * Admin bookings calendar reads from Postgres when DATABASE_URL is set.
 * Set CMS_ADMIN_BOOKINGS_SOURCE=s3 to keep reading cmsSite from S3.
 */
export function isAdminBookingsFromPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_ADMIN_BOOKINGS_SOURCE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

/**
 * Public /booking page reads scheduling data from Postgres when DATABASE_URL is set.
 * Set CMS_PUBLIC_BOOKING_SOURCE=s3 to keep reading cmsSite from S3.
 */
export function isPublicBookingFromPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_PUBLIC_BOOKING_SOURCE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

/**
 * Admin services, employees, and booking blocks read/write from Postgres when DATABASE_URL is set.
 * Set CMS_ADMIN_SITE_CONFIG_SOURCE=s3 to keep using cmsSite JSON for scheduling config.
 */
export function isAdminSiteConfigFromPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_ADMIN_SITE_CONFIG_SOURCE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

/**
 * Public services, about, and contact read from Postgres when DATABASE_URL is set.
 * Set CMS_PUBLIC_CONTENT_SOURCE=s3 to keep reading from cmsSite JSON.
 */
export function isPublicContentFromPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_PUBLIC_CONTENT_SOURCE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

/**
 * Admin about and contact read/write from Postgres when DATABASE_URL is set.
 * Set CMS_ADMIN_CONTENT_SOURCE=s3 to keep using cmsSite JSON.
 */
export function isAdminContentFromPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_ADMIN_CONTENT_SOURCE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

/**
 * New online bookings write to Postgres first when DATABASE_URL is set.
 * Set CMS_PUBLIC_BOOKING_WRITE=s3 to keep appending bookings to cmsSite JSON.
 */
export function isPublicBookingWriteToPostgres(): boolean {
  if (!isDatabaseConfigured()) return false;
  const flag = runtimeEnv('CMS_PUBLIC_BOOKING_WRITE')?.trim().toLowerCase();
  if (flag === 's3' || flag === 'cms') return false;
  return true;
}

export function databaseUrlFromEnv(): string | undefined {
  return runtimeEnv('DATABASE_URL')?.trim() || undefined;
}

/** SSL for Render external URLs; internal URLs often omit sslmode. */
export function pgSslOption(): boolean | { rejectUnauthorized: boolean } | undefined {
  const url = databaseUrlFromEnv() ?? '';
  if (!url) return undefined;
  if (/sslmode=(require|verify-full|verify-ca)/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  if (url.includes('.render.com')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}
