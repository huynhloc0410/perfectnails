import { NextResponse } from 'next/server';
import { loadBookingSiteSnapshot } from '@/lib/booking/bookingSiteLoader';
import { isDatabaseConfigured, isPublicBookingFromPostgres } from '@/lib/db/config';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDatabaseConfigured() || !isPublicBookingFromPostgres()) {
    return NextResponse.json(
      {
        configured: false,
        source: 'cms',
        reason: !isDatabaseConfigured()
          ? 'DATABASE_URL not set'
          : 'CMS_PUBLIC_BOOKING_SOURCE=s3',
      },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    const snapshot = await loadBookingSiteSnapshot();
    if (!snapshot) {
      return NextResponse.json(
        { error: 'Failed to load booking data', configured: true },
        { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
      );
    }

    return NextResponse.json(
      {
        configured: true,
        source: snapshot.source,
        site: {
          services: snapshot.services,
          employees: snapshot.employees,
          bookings: snapshot.bookings,
          bookingBlocks: snapshot.bookingBlocks,
        },
      },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/booking/site-data:', e);
    return NextResponse.json(
      { error: 'Failed to load booking data from database', configured: true },
      { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }
}
