import type { PoolClient } from 'pg';
import type { CmsBooking } from '@/lib/cmsSiteTypes';
import { compactLegacyId } from '@/lib/db/legacyId';
import { bookingStatusLabel, isSchedulingActiveStatus, normalizeBookingStatus } from '@/lib/db/bookingStatus';
import { salonTimeSlotLabel } from '@/lib/db/timezone';
import { withPgClient } from '@/lib/db/pool';

type BookingRow = {
  legacy_id: string | null;
  start_datetime: Date;
  notes: string | null;
  customer_name: string;
  phone: string;
  service_name: string | null;
  duration_at_booking: number | null;
  employee_legacy_id: string | null;
  status: string;
};

const LIST_SQL = `
  SELECT
    COALESCE(bm.legacy_id, NULLIF(REPLACE(b.booking_number, 'CMS-', ''), b.booking_number)) AS legacy_id,
    b.start_datetime,
    b.notes,
    c.name AS customer_name,
    c.phone,
    bs.service_name,
    bs.duration_at_booking,
    em.legacy_id AS employee_legacy_id,
    b.status::text AS status
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  LEFT JOIN booking_services bs ON bs.booking_id = b.id
  LEFT JOIN booking_assignments ba ON ba.booking_service_id = bs.id
  LEFT JOIN legacy_id_mappings bm ON bm.entity_type = 'booking' AND bm.uuid = b.id
  LEFT JOIN legacy_id_mappings em ON em.entity_type = 'employee' AND em.uuid = ba.employee_id
  WHERE b.salon_id = (
    SELECT id FROM salons WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
  )
  ORDER BY b.start_datetime ASC
`;

function rowToCmsBooking(row: BookingRow): CmsBooking | null {
  const legacyId = row.legacy_id?.trim();
  if (!legacyId) return null;

  const start = row.start_datetime instanceof Date ? row.start_datetime : new Date(row.start_datetime);
  if (!Number.isFinite(start.getTime())) return null;

  const duration = row.duration_at_booking && row.duration_at_booking > 0 ? row.duration_at_booking : 45;
  const status = normalizeBookingStatus(row.status);

  return {
    id: legacyId,
    name: row.customer_name?.trim() || 'Guest',
    phone: row.phone?.trim() || '',
    service: row.service_name?.trim() || 'Appointment',
    employee: row.employee_legacy_id?.trim() || undefined,
    date: start.toISOString(),
    timeSlot: salonTimeSlotLabel(start),
    duration,
    status,
    ...(row.notes?.trim() ? { notes: row.notes.trim() } : {}),
  };
}

export async function listAdminBookingsFromPostgres(): Promise<CmsBooking[]> {
  const rows = await withPgClient((client) => client.query<BookingRow>(LIST_SQL));
  const out: CmsBooking[] = [];
  for (const row of rows.rows) {
    const b = rowToCmsBooking(row);
    if (b) out.push(b);
  }
  return out;
}

/** Active bookings only — used for public slot availability. */
export async function listSchedulingBookingsFromPostgres(): Promise<CmsBooking[]> {
  const all = await listAdminBookingsFromPostgres();
  return all.filter((b) => isSchedulingActiveStatus(b.status));
}

export { bookingStatusLabel, isSchedulingActiveStatus };

async function resolveBookingPgId(client: PoolClient, legacyId: string): Promise<string | null> {
  const key = compactLegacyId(legacyId);
  const mapped = await client.query<{ uuid: string }>(
    `SELECT uuid FROM legacy_id_mappings WHERE entity_type = 'booking' AND legacy_id = $1`,
    [key]
  );
  if (mapped.rows[0]?.uuid) return mapped.rows[0].uuid;

  const byNumber = await client.query<{ id: string }>(
    `SELECT id FROM bookings WHERE booking_number = $1 LIMIT 1`,
    [`CMS-${legacyId}`.slice(0, 32)]
  );
  return byNumber.rows[0]?.id ?? null;
}

/** Delete booking row and related mappings/logs. Returns false if not found. */
export async function deleteAdminBookingFromPostgres(legacyId: string): Promise<boolean> {
  const id = legacyId.trim();
  if (!id) return false;

  return withPgClient(async (client) => {
    const pgId = await resolveBookingPgId(client, id);
    if (!pgId) return false;

    const bsKey = compactLegacyId(`bs:${id}`);
    const bookingKey = compactLegacyId(id);

    await client.query('BEGIN');
    try {
      await client.query(`DELETE FROM sms_logs WHERE booking_id = $1`, [pgId]);
      await client.query(`DELETE FROM bookings WHERE id = $1`, [pgId]);
      await client.query(
        `DELETE FROM legacy_id_mappings WHERE entity_type = 'booking' AND legacy_id = $1`,
        [bookingKey]
      );
      await client.query(
        `DELETE FROM legacy_id_mappings WHERE entity_type = 'booking_service' AND legacy_id = $1`,
        [bsKey]
      );
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}
