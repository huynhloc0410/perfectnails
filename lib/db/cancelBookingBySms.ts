import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { customerPhoneDigits10 } from '@/lib/db/legacyId';
import { getDefaultSalonId } from '@/lib/db/salon';
import { withPgClient } from '@/lib/db/pool';
import { normalizePhoneE164 } from '@/lib/phone';
import { formatApptTimeForSms } from '@/lib/smsTemplates';

export type SmsCancelResult =
  | { ok: true; legacyId: string; customerName: string; replyBody: string }
  | { ok: false; replyBody: string };

/** True when the inbound SMS body is a cancel request. */
export function isSmsCancelCommand(body: string): boolean {
  const text = String(body ?? '').trim().toLowerCase();
  if (!text) return false;
  if (text === 'cancel' || text === 'cancelled' || text === 'canceled') return true;
  if (text.startsWith('cancel ')) return true;
  return false;
}

type UpcomingRow = {
  id: string;
  legacy_id: string | null;
  customer_name: string;
  service_name: string | null;
  start_datetime: Date;
};

async function findNextUpcomingBooking(
  client: PoolClient,
  salonId: string,
  phoneDigits10: string
): Promise<UpcomingRow | null> {
  const r = await client.query<UpcomingRow>(
    `SELECT
       b.id,
       COALESCE(bm.legacy_id, NULLIF(REPLACE(b.booking_number, 'CMS-', ''), b.booking_number)) AS legacy_id,
       c.name AS customer_name,
       bs.service_name,
       b.start_datetime
     FROM bookings b
     JOIN customers c ON c.id = b.customer_id
     LEFT JOIN booking_services bs ON bs.booking_id = b.id
     LEFT JOIN legacy_id_mappings bm ON bm.entity_type = 'booking' AND bm.uuid = b.id
     WHERE b.salon_id = $1
       AND b.status IN ('pending', 'confirmed')
       AND b.start_datetime > NOW()
       AND RIGHT(regexp_replace(c.phone, '\\D', '', 'g'), 10) = $2
     ORDER BY b.start_datetime ASC
     LIMIT 1`,
    [salonId, phoneDigits10]
  );
  return r.rows[0] ?? null;
}

async function cancelBookingRow(client: PoolClient, bookingId: string): Promise<boolean> {
  const r = await client.query(
    `UPDATE bookings
     SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'confirmed')`,
    [bookingId]
  );
  return (r.rowCount ?? 0) > 0;
}

async function logInboundSms(
  client: PoolClient,
  salonId: string,
  bookingId: string | null,
  phoneE164: string,
  body: string,
  messageSid: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO sms_logs (
       id, salon_id, booking_id, phone_number, message_type, message_body, twilio_sid, status, created_at
     ) VALUES ($1, $2, $3, $4, 'follow_up', $5, $6, 'delivered', NOW())`,
    [randomUUID(), salonId, bookingId, phoneE164, body.slice(0, 500), messageSid]
  );
}

/** Cancel the guest's next upcoming booking from an inbound SMS reply. */
export async function handleInboundSmsCancel(params: {
  fromPhone: string;
  body: string;
  messageSid?: string | null;
}): Promise<SmsCancelResult> {
  const phoneE164 = normalizePhoneE164(params.fromPhone);
  const digits10 = customerPhoneDigits10(params.fromPhone);

  if (!phoneE164 || digits10.length < 10) {
    return {
      ok: false,
      replyBody: 'We could not match your phone number. Please call the salon to cancel.',
    };
  }

  if (!isSmsCancelCommand(params.body)) {
    return {
      ok: false,
      replyBody: 'Reply CANCEL to cancel your next upcoming appointment.',
    };
  }

  return withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const salonId = await getDefaultSalonId(client);
      const row = await findNextUpcomingBooking(client, salonId, digits10);

      if (!row) {
        await logInboundSms(client, salonId, null, phoneE164, params.body, params.messageSid ?? null);
        await client.query('COMMIT');
        return {
          ok: false,
          replyBody: 'No upcoming appointment found for this number.',
        };
      }

      const cancelled = await cancelBookingRow(client, row.id);
      const legacyId = row.legacy_id?.trim() || row.id;
      const when = formatApptTimeForSms(
        row.start_datetime instanceof Date
          ? row.start_datetime.toISOString()
          : String(row.start_datetime)
      );
      const name = row.customer_name?.trim() || 'there';

      await logInboundSms(client, salonId, row.id, phoneE164, params.body, params.messageSid ?? null);

      if (!cancelled) {
        await client.query('COMMIT');
        return {
          ok: false,
          replyBody: 'That appointment is already cancelled or cannot be changed by text.',
        };
      }

      await client.query('COMMIT');
      return {
        ok: true,
        legacyId,
        customerName: name,
        replyBody: `Hi ${name}, your ${row.service_name?.trim() || 'appointment'} on ${when} is cancelled. Call us if you need to rebook.`,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}
