import type { CmsBooking } from '@/lib/cmsSiteTypes';
import type { SlotBooking } from '@/lib/booking/slotAvailability';
import { salonAppointmentDate, salonTimeSlotLabel } from '@/lib/db/timezone';
import { withPgClient } from '@/lib/db/pool';

type SlotRow = {
  id: string;
  start_datetime: Date;
  service_name: string | null;
  duration_at_booking: number | null;
  employee_legacy_id: string | null;
};

const DAY_SQL = `
  SELECT
    b.id::text AS id,
    b.start_datetime,
    bs.service_name,
    bs.duration_at_booking,
    em.legacy_id AS employee_legacy_id
  FROM bookings b
  LEFT JOIN booking_services bs ON bs.booking_id = b.id
  LEFT JOIN booking_assignments ba ON ba.booking_service_id = bs.id
  LEFT JOIN legacy_id_mappings em ON em.entity_type = 'employee' AND em.uuid = ba.employee_id
  WHERE b.salon_id = (
    SELECT id FROM salons WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
  )
    AND b.appointment_date = $1::date
  ORDER BY b.start_datetime ASC
`;

function rowToSlotBooking(row: SlotRow): SlotBooking | null {
  const id = row.id?.trim();
  if (!id) return null;
  const start = row.start_datetime instanceof Date ? row.start_datetime : new Date(row.start_datetime);
  if (!Number.isFinite(start.getTime())) return null;
  const duration = row.duration_at_booking && row.duration_at_booking > 0 ? row.duration_at_booking : 45;
  const employee = row.employee_legacy_id?.trim();
  return {
    id,
    service: row.service_name?.trim() || 'Appointment',
    ...(employee ? { employee } : {}),
    date: start.toISOString(),
    timeSlot: salonTimeSlotLabel(start),
    duration,
  };
}

/** Occupancy for one salon calendar day. No customer name, phone, or notes. */
export async function listPublicSlotBookingsForDate(dateYmd: string): Promise<SlotBooking[]> {
  const rows = await withPgClient((client) => client.query<SlotRow>(DAY_SQL, [dateYmd]));
  const out: SlotBooking[] = [];
  const seen = new Set<string>();
  for (const row of rows.rows) {
    const booking = rowToSlotBooking(row);
    if (!booking || seen.has(booking.id)) continue;
    seen.add(booking.id);
    out.push(booking);
  }
  return out;
}

function cmsBookingSalonYmd(date: string): string | null {
  const raw = date.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return null;
  return salonAppointmentDate(parsed);
}

/** Same-day occupancy from a legacy CMS list, without customer fields. */
export function slotBookingsFromCmsForDate(bookings: CmsBooking[], dateYmd: string): SlotBooking[] {
  const out: SlotBooking[] = [];
  for (const booking of bookings) {
    if (cmsBookingSalonYmd(String(booking.date ?? '')) !== dateYmd) continue;
    const id = String(booking.id ?? '').trim();
    if (!id) continue;
    const employee = String(booking.employee ?? '').trim();
    out.push({
      id,
      service: String(booking.service ?? '').trim() || 'Appointment',
      ...(employee ? { employee } : {}),
      date: String(booking.date),
      timeSlot: String(booking.timeSlot ?? ''),
      duration: booking.duration,
    });
  }
  return out;
}
