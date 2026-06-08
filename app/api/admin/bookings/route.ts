import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import { listAdminBookingsFromPostgres } from '@/lib/db/adminBookings';
import { isAdminBookingsFromPostgres, isDatabaseConfigured } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { source: 'cms', configured: false, reason: 'DATABASE_URL not set' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  if (!isAdminBookingsFromPostgres()) {
    return NextResponse.json(
      { source: 'cms', configured: false, reason: 'CMS_ADMIN_BOOKINGS_SOURCE=s3' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    const bookings = await listAdminBookingsFromPostgres();
    return NextResponse.json(
      { source: 'postgres', configured: true, bookings },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/admin/bookings:', e);
    return NextResponse.json(
      { error: 'Failed to load bookings from database', configured: true },
      { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }
}
