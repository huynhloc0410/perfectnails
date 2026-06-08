import type { CmsBooking, CmsBookingBlock, CmsEmployee, CmsService } from '@/lib/cmsSiteTypes';
import { isPublicBookingFromPostgres } from '@/lib/db/config';
import { loadPublicBookingSiteFromPostgres } from '@/lib/db/publicBookingSite';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

export type BookingSiteSnapshot = {
  source: 'postgres' | 's3';
  services: CmsService[];
  employees: CmsEmployee[];
  bookings: CmsBooking[];
  bookingBlocks: CmsBookingBlock[];
};

/** Scheduling data for public booking (slots + POST validation). */
export async function loadBookingSiteSnapshot(): Promise<BookingSiteSnapshot | null> {
  if (isPublicBookingFromPostgres()) {
    try {
      const site = await loadPublicBookingSiteFromPostgres();
      return { source: 'postgres', ...site };
    } catch (e) {
      console.error('loadBookingSiteSnapshot postgres failed, trying S3:', e);
    }
  }

  const site = await readCmsSiteFromS3();
  if (!site) return null;

  return {
    source: 's3',
    services: site.services,
    employees: site.employees,
    bookings: site.bookings,
    bookingBlocks: site.bookingBlocks ?? [],
  };
}
