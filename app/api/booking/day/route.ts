import { NextResponse } from 'next/server';
import { isYmdWithinPublicBookingHorizon } from '@/lib/bookingLeadTime';
import { isDatabaseConfigured, isPublicBookingFromPostgres } from '@/lib/db/config';
import { listPublicSlotBookingsForDate, slotBookingsFromCmsForDate } from '@/lib/db/publicSlotBookings';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import { readCmsSiteFromS3 } from '@/lib/s3CmsSite';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get('date')?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isYmdWithinPublicBookingHorizon(date)) {
    return NextResponse.json(
      { error: 'invalid_date' },
      { status: 400, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    if (isDatabaseConfigured() && isPublicBookingFromPostgres()) {
      const bookings = await listPublicSlotBookingsForDate(date);
      return NextResponse.json({ bookings }, { headers: CACHE_HEADERS_PRIVATE_NO_STORE });
    }

    const site = await readCmsSiteFromS3();
    return NextResponse.json(
      { bookings: slotBookingsFromCmsForDate(site?.bookings ?? [], date) },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/booking/day:', e);
    return NextResponse.json(
      { error: 'day_unavailable' },
      { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }
}
