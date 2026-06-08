import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import type { CmsBooking, CmsSmsJob } from '@/lib/cmsSiteTypes';
import {
  customerLegacyId,
  customerPhoneDigits10,
  customerPhoneStored,
} from '@/lib/db/legacyId';
import { getMappedUuid, mappedOrNew, rememberMapping } from '@/lib/db/legacyMapping';
import { getDefaultSalonId } from '@/lib/db/salon';
import { salonAppointmentDate } from '@/lib/db/timezone';
import { withPgClient } from '@/lib/db/pool';
import { bookingReminderSms } from '@/lib/smsTemplates';
import { parseReminderHoursBefore } from '@/lib/bookingReminderJobs';

function customerDisplayName(name: string): string {
  const n = name.trim();
  return n || 'Guest';
}

async function resolveCustomerId(
  client: PoolClient,
  salonId: string,
  phoneRaw: string,
  name: string
): Promise<string> {
  const legacyId = customerLegacyId(phoneRaw);
  const mapped = await getMappedUuid(client, 'customer', legacyId);
  if (mapped) {
    await client.query(
      `UPDATE customers SET name = $2, phone = $3, sms_opt_in = TRUE, updated_at = NOW()
       WHERE id = $1`,
      [mapped, customerDisplayName(name), customerPhoneStored(phoneRaw)]
    );
    return mapped;
  }

  const digits10 = customerPhoneDigits10(phoneRaw);
  if (digits10.length >= 10) {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM customers
       WHERE salon_id = $1 AND deleted_at IS NULL
         AND RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = $2
       ORDER BY created_at ASC
       LIMIT 1`,
      [salonId, digits10]
    );
    if (existing.rows[0]?.id) {
      const id = existing.rows[0].id;
      await rememberMapping(client, 'customer', legacyId, id);
      await client.query(
        `UPDATE customers SET name = $2, phone = $3, sms_opt_in = TRUE, updated_at = NOW()
         WHERE id = $1`,
        [id, customerDisplayName(name), customerPhoneStored(phoneRaw)]
      );
      return id;
    }
  }

  const id = await mappedOrNew(client, 'customer', legacyId);
  await client.query(
    `INSERT INTO customers (id, salon_id, name, phone, sms_opt_in)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       sms_opt_in = TRUE,
       updated_at = NOW()`,
    [id, salonId, customerDisplayName(name), customerPhoneStored(phoneRaw)]
  );
  return id;
}

async function resolveServicePgId(
  client: PoolClient,
  salonId: string,
  serviceName: string,
  serviceLegacyId?: string
): Promise<{ id: string | null; price: number }> {
  if (serviceLegacyId?.trim()) {
    const mapped = await getMappedUuid(client, 'service', serviceLegacyId);
    if (mapped) {
      const r = await client.query<{ price: string }>(
        `SELECT price::text FROM services WHERE id = $1 AND salon_id = $2 AND deleted_at IS NULL`,
        [mapped, salonId]
      );
      return { id: mapped, price: parseFloat(r.rows[0]?.price ?? '0') || 0 };
    }
  }

  const byName = await client.query<{ id: string; price: string }>(
    `SELECT id, price::text AS price FROM services
     WHERE salon_id = $1 AND deleted_at IS NULL
       AND lower(trim(name)) = lower(trim($2))
     LIMIT 1`,
    [salonId, serviceName]
  );
  if (byName.rows[0]?.id) {
    return {
      id: byName.rows[0].id,
      price: parseFloat(byName.rows[0].price) || 0,
    };
  }
  return { id: null, price: 0 };
}

async function resolveEmployeePgId(
  client: PoolClient,
  employeeLegacyId: string
): Promise<string | null> {
  const id = employeeLegacyId.trim();
  if (!id) return null;
  return getMappedUuid(client, 'employee', id);
}

export type CreateOnlineBookingParams = {
  booking: CmsBooking;
  phoneE164: string | null;
  serviceLegacyId?: string;
  confirmationBody?: string;
  confirmationSid?: string;
  reminderJobs: CmsSmsJob[];
};

/** Insert online booking + reminders into PostgreSQL (Phase 3 write path). */
export async function createOnlineBookingInPostgres(
  params: CreateOnlineBookingParams
): Promise<void> {
  const { booking, phoneE164, serviceLegacyId, confirmationBody, confirmationSid, reminderJobs } =
    params;

  const legacyId = booking.id.trim();
  const start = new Date(booking.date);
  if (!Number.isFinite(start.getTime())) {
    throw new Error('Invalid booking date');
  }

  const duration = booking.duration > 0 ? booking.duration : 45;
  const end = new Date(start.getTime() + duration * 60_000);
  const apptDate = salonAppointmentDate(start);
  const bookingNumber = `CMS-${legacyId}`.slice(0, 32);

  await withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const salonId = await getDefaultSalonId(client);
      const customerId = await resolveCustomerId(client, salonId, booking.phone, booking.name);
      const svc = await resolveServicePgId(client, salonId, booking.service, serviceLegacyId);
      const price = svc.price;

      const bookingId = await mappedOrNew(client, 'booking', legacyId);
      const bsId = await mappedOrNew(client, 'booking_service', `bs:${legacyId}`);

      await client.query(
        `INSERT INTO bookings (
           id, salon_id, customer_id, booking_number, status,
           appointment_date, start_datetime, end_datetime, notes,
           subtotal, total
         ) VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8, $9, $9)`,
        [
          bookingId,
          salonId,
          customerId,
          bookingNumber,
          apptDate,
          start,
          end,
          booking.notes?.trim() || null,
          price,
        ]
      );

      await client.query(
        `INSERT INTO booking_services (
           id, booking_id, service_id, service_name,
           price_at_booking, duration_at_booking
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [bsId, bookingId, svc.id, booking.service.trim(), price, duration]
      );

      if (booking.employee?.trim()) {
        const empPgId = await resolveEmployeePgId(client, booking.employee);
        if (empPgId) {
          await client.query(
            `INSERT INTO booking_assignments (id, booking_service_id, employee_id)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [randomUUID(), bsId, empPgId]
          );
        }
      }

      if (confirmationBody && phoneE164) {
        await client.query(
          `INSERT INTO sms_logs (
             id, salon_id, booking_id, customer_id, phone_number,
             message_type, message_body, twilio_sid, status, sent_at
           ) VALUES ($1, $2, $3, $4, $5, 'confirmation', $6, $7, 'sent', NOW())`,
          [
            randomUUID(),
            salonId,
            bookingId,
            customerId,
            phoneE164,
            confirmationBody,
            confirmationSid ?? null,
          ]
        );
      }

      for (const job of reminderJobs) {
        const hoursBefore = parseReminderHoursBefore(job.id);
        const body = bookingReminderSms({
          name: booking.name,
          isoDate: booking.date,
          service: booking.service,
          hoursBefore: hoursBefore === 24 || hoursBefore === 2 ? hoursBefore : undefined,
        });
        const sendAt = new Date(job.sendAt);
        await client.query(
          `INSERT INTO sms_logs (
             id, salon_id, booking_id, customer_id, phone_number,
             message_type, message_body, status, scheduled_send_at, legacy_job_id, created_at
           ) VALUES ($1, $2, $3, $4, $5, 'reminder', $6, 'queued', $7, $8, NOW())
           ON CONFLICT (legacy_job_id) DO NOTHING`,
          [
            randomUUID(),
            salonId,
            bookingId,
            customerId,
            job.to,
            body,
            Number.isFinite(sendAt.getTime()) ? sendAt : null,
            job.id,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}
