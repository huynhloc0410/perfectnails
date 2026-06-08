import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { removeBookingFromCmsSite } from '@/lib/cms/patchCmsSiteBooking';
import { deleteAdminBookingFromPostgres } from '@/lib/db/adminBookings';
import { isAdminBookingsFromPostgres, isDatabaseConfigured } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured() || !isAdminBookingsFromPostgres()) {
    return NextResponse.json(
      { error: 'Admin bookings are not configured to use PostgreSQL' },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const legacyId = decodeURIComponent(id).trim();
  if (!legacyId) {
    return NextResponse.json({ error: 'Missing booking id' }, { status: 400 });
  }

  try {
    const deleted = await deleteAdminBookingFromPostgres(legacyId);
    if (!deleted) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    try {
      await removeBookingFromCmsSite(legacyId);
    } catch (e) {
      console.error('S3 cmsSite patch after PG delete failed:', e);
    }

    return NextResponse.json({ ok: true, id: legacyId, source: 'postgres' });
  } catch (e) {
    console.error('DELETE /api/admin/bookings/[id]:', e);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 502 });
  }
}
