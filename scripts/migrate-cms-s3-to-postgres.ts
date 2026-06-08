/**
 * One-way copy: S3 cmsSite → PostgreSQL.
 * Does NOT modify S3. Safe to re-run (uses legacy_id_mappings).
 *
 * Usage:
 *   export DATABASE_URL='postgresql://...'
 *   export AWS_ACCESS_KEY_ID=...  (same as production)
 *   npx tsx scripts/migrate-cms-s3-to-postgres.ts
 *   npx tsx scripts/migrate-cms-s3-to-postgres.ts --dry-run
 */
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import type { CmsBooking, CmsEmployee, CmsService, CmsSitePayload } from '../lib/cmsSiteTypes';
import {
  employeeCanPerformService,
  isNonBookableAddonService,
} from '../lib/booking/serviceEmployeeMatch';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '../lib/s3CmsSite';
import { compactLegacyId, customerLegacyId, customerPhoneDigits10, customerPhoneStored, galleryLegacyId } from '../lib/db/legacyId';
import { disconnectPgPool, withPgClient } from '../lib/db/pool';
import { isDatabaseConfigured } from '../lib/db/config';

const DRY_RUN = process.argv.includes('--dry-run');
const SALON_LEGACY_ID = 'default';

function customerDisplayName(name: string): string {
  const n = name.trim();
  return n || 'Guest';
}

function categoryLegacyId(name: string): string {
  return compactLegacyId(`cat:${name.trim().toLowerCase()}`);
}

async function getMappedUuid(
  client: PoolClient,
  entityType: string,
  legacyId: string
): Promise<string | null> {
  const key = compactLegacyId(legacyId);
  const r = await client.query<{ uuid: string }>(
    `SELECT uuid FROM legacy_id_mappings WHERE entity_type = $1 AND legacy_id = $2`,
    [entityType, key]
  );
  return r.rows[0]?.uuid ?? null;
}

async function rememberMapping(
  client: PoolClient,
  entityType: string,
  legacyId: string,
  uuid: string
): Promise<void> {
  const key = compactLegacyId(legacyId);
  await client.query(
    `INSERT INTO legacy_id_mappings (entity_type, legacy_id, uuid)
     VALUES ($1, $2, $3)
     ON CONFLICT (entity_type, legacy_id) DO UPDATE SET uuid = EXCLUDED.uuid`,
    [entityType, key, uuid]
  );
}

async function resolveUuid(
  client: PoolClient,
  entityType: string,
  legacyId: string,
  create: (uuid: string) => Promise<void>
): Promise<string> {
  const existing = await getMappedUuid(client, entityType, legacyId);
  if (existing) return existing;
  const uuid = randomUUID();
  if (!DRY_RUN) {
    await create(uuid);
    await rememberMapping(client, entityType, legacyId, uuid);
  }
  return uuid;
}

/** Same phone (any format) → same customer row within a salon. */
async function resolveCustomerId(
  client: PoolClient,
  salonId: string,
  phoneRaw: string
): Promise<string> {
  const legacyId = customerLegacyId(phoneRaw);
  const mapped = await getMappedUuid(client, 'customer', legacyId);
  if (mapped) return mapped;

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
      if (!DRY_RUN) await rememberMapping(client, 'customer', legacyId, id);
      return id;
    }
  }

  const uuid = randomUUID();
  if (!DRY_RUN) await rememberMapping(client, 'customer', legacyId, uuid);
  return uuid;
}

async function upsertSalon(client: PoolClient, site: CmsSitePayload): Promise<string> {
  const title = site.about?.title?.trim() || 'Perfect Nails & Spa';
  return resolveUuid(client, 'salon', SALON_LEGACY_ID, async (uuid) => {
    await client.query(
      `INSERT INTO salons (id, name, phone, email, address, timezone)
       VALUES ($1, $2, $3, $4, $5, 'America/Phoenix')`,
      [
        uuid,
        title,
        site.contact.phone || null,
        site.contact.email || null,
        site.contact.address || null,
      ]
    );
    await client.query(
      `INSERT INTO business_settings (salon_id, settings_json)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (salon_id) DO UPDATE SET settings_json = EXCLUDED.settings_json`,
      [
        uuid,
        JSON.stringify({
          about: site.about,
          contact: site.contact,
          cms_version: site.version,
        }),
      ]
    );
  });
}

async function upsertCategories(
  client: PoolClient,
  salonId: string,
  services: CmsService[]
): Promise<Map<string, string>> {
  const names = new Map<string, number>();
  for (const s of services) {
    const cat = (s.category || 'General').trim() || 'General';
    if (!names.has(cat)) names.set(cat, names.size);
  }
  const idByName = new Map<string, string>();
  for (const [name, order] of names) {
    const legacyId = categoryLegacyId(name);
    const uuid = await resolveUuid(client, 'category', legacyId, async (id) => {
      await client.query(
        `INSERT INTO categories (id, salon_id, name, display_order)
         VALUES ($1, $2, $3, $4)`,
        [id, salonId, name, order]
      );
    });
    idByName.set(name, uuid);
  }
  return idByName;
}

async function upsertServices(
  client: PoolClient,
  salonId: string,
  categoryIds: Map<string, string>,
  services: CmsService[]
): Promise<Map<string, CmsService & { pgId: string }>> {
  const byLegacy = new Map<string, CmsService & { pgId: string }>();
  for (const [i, s] of services.entries()) {
    const catName = (s.category || 'General').trim() || 'General';
    const categoryId = categoryIds.get(catName);
    if (!categoryId) continue;
    const legacyId = s.id || `service-name:${s.name}`;
    const online = !isNonBookableAddonService(s);
    const uuid = await resolveUuid(client, 'service', legacyId, async (id) => {
      await client.query(
        `INSERT INTO services (
           id, salon_id, category_id, name, description,
           duration_minutes, price, display_order, online_booking_enabled
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          salonId,
          categoryId,
          s.name,
          s.description || '',
          s.duration > 0 ? s.duration : 45,
          s.price,
          i,
          online,
        ]
      );
    });
    byLegacy.set(legacyId, { ...s, pgId: uuid });
    byLegacy.set(s.name.trim().toLowerCase(), { ...s, pgId: uuid });
  }
  return byLegacy;
}

async function upsertEmployees(
  client: PoolClient,
  salonId: string,
  employees: CmsEmployee[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const [i, e] of employees.entries()) {
    const legacyId = e.id || e.name;
    const uuid = await resolveUuid(client, 'employee', legacyId, async (id) => {
      await client.query(
        `INSERT INTO employees (
           id, salon_id, first_name, nickname, phone, display_order, employment_status
         ) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
        [id, salonId, e.name, e.name, e.phone || null, i]
      );
    });
    map.set(legacyId, uuid);
    map.set(e.name.trim().toLowerCase(), uuid);
  }
  return map;
}

async function upsertEmployeeServices(
  client: PoolClient,
  employees: CmsEmployee[],
  employeeIds: Map<string, string>,
  services: CmsService[],
  serviceByKey: Map<string, CmsService & { pgId: string }>
): Promise<void> {
  for (const e of employees) {
    const empLegacy = e.id || e.name;
    const employeeId = employeeIds.get(empLegacy);
    if (!employeeId) continue;
    for (const s of services) {
      if (isNonBookableAddonService(s)) continue;
      if (!employeeCanPerformService(e, s)) continue;
      const svc = serviceByKey.get(s.id || `service-name:${s.name}`);
      if (!svc) continue;
      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO employee_services (employee_id, service_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [employeeId, svc.pgId]
        );
      }
    }
  }
}

async function upsertCustomersFromBookings(
  client: PoolClient,
  salonId: string,
  bookings: CmsBooking[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const seen = new Set<string>();

  for (const b of bookings) {
    const legacyId = customerLegacyId(b.phone);
    if (seen.has(legacyId)) continue;
    seen.add(legacyId);

    const id = await resolveCustomerId(client, salonId, b.phone);
    const phoneStored = customerPhoneStored(b.phone);

    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO customers (id, salon_id, name, phone, sms_opt_in)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           updated_at = NOW()`,
        [id, salonId, customerDisplayName(b.name), phoneStored]
      );
    }
    map.set(legacyId, id);
  }
  return map;
}

function findServiceForBooking(
  booking: CmsBooking,
  services: CmsService[],
  serviceByKey: Map<string, CmsService & { pgId: string }>
): (CmsService & { pgId: string }) | null {
  const nameKey = booking.service.trim().toLowerCase();
  const byName = serviceByKey.get(nameKey);
  if (byName) return byName;
  const match = services.find((s) => s.name.trim().toLowerCase() === nameKey);
  if (match) {
    return serviceByKey.get(match.id || `service-name:${match.name}`) ?? null;
  }
  return null;
}

async function upsertBookings(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload,
  customerIds: Map<string, string>,
  employeeIds: Map<string, string>,
  serviceByKey: Map<string, CmsService & { pgId: string }>
): Promise<void> {
  for (const b of site.bookings) {
    const legacyId = b.id;
    const phoneKey = customerLegacyId(b.phone);
    const customerId = customerIds.get(phoneKey);
    if (!customerId) continue;

    const start = new Date(b.date);
    if (!Number.isFinite(start.getTime())) continue;
    const duration = b.duration > 0 ? b.duration : 45;
    const end = new Date(start.getTime() + duration * 60_000);
    const apptDate = start.toISOString().slice(0, 10);
    const bookingNumber = `CMS-${legacyId}`.slice(0, 32);
    const svc = findServiceForBooking(b, site.services, serviceByKey);
    const price = svc?.price ?? 0;

    const bookingUuid = await resolveUuid(client, 'booking', legacyId, async (id) => {
      await client.query(
        `INSERT INTO bookings (
           id, salon_id, customer_id, booking_number, status,
           appointment_date, start_datetime, end_datetime, notes,
           subtotal, total
         ) VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8, $9, $9)`,
        [id, salonId, customerId, bookingNumber, apptDate, start, end, b.notes?.trim() || null, price]
      );

      const bsId = randomUUID();
      await client.query(
        `INSERT INTO booking_services (
           id, booking_id, service_id, service_name,
           price_at_booking, duration_at_booking
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [bsId, id, svc?.pgId ?? null, b.service.trim(), price, duration]
      );

      if (b.employee?.trim()) {
        const empId =
          employeeIds.get(b.employee) ??
          employeeIds.get(b.employee.trim().toLowerCase());
        if (empId) {
          await client.query(
            `INSERT INTO booking_assignments (booking_service_id, employee_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [bsId, empId]
          );
        }
      }
    });

    if (DRY_RUN && !bookingUuid) {
      // resolveUuid returns uuid even in dry run
    }
  }
}

async function upsertGallery(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload
): Promise<void> {
  for (const [i, g] of site.gallery.entries()) {
    const legacyId = galleryLegacyId(g.full);
    await resolveUuid(client, 'gallery', legacyId, async (id) => {
      await client.query(
        `INSERT INTO gallery_photos (id, salon_id, image_url, thumbnail_url, display_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, salonId, g.full, g.thumb || g.full, i]
      );
    });
  }
}

async function upsertBookingBlocks(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload,
  employeeIds: Map<string, string>
): Promise<void> {
  for (const block of site.bookingBlocks) {
    const legacyId = block.id;
    await resolveUuid(client, 'booking_block', legacyId, async (id) => {
      const employeeId = block.employeeId
        ? employeeIds.get(block.employeeId) ?? null
        : null;
      await client.query(
        `INSERT INTO salon_booking_blocks (
           id, salon_id, employee_id, block_date, start_time, end_time, salon_wide
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          salonId,
          employeeId,
          block.date,
          block.startTime,
          block.endTime,
          block.salonWide,
        ]
      );
    });
  }
}

async function upsertSmsLogs(client: PoolClient, salonId: string, site: CmsSitePayload): Promise<void> {
  for (const job of site.smsJobs) {
    const legacyId = job.id;
    const messageType =
      job.kind === 'booking_confirmation' ? 'confirmation' : 'reminder';
    const status =
      job.status === 'sent' ? 'sent' : job.status === 'error' ? 'failed' : 'queued';

    await resolveUuid(client, 'sms_job', legacyId, async (id) => {
      let bookingId: string | null = null;
      if (job.bookingId) {
        bookingId = await getMappedUuid(client, 'booking', job.bookingId);
      }
      await client.query(
        `INSERT INTO sms_logs (
           id, salon_id, booking_id, phone_number, message_type,
           twilio_sid, status, sent_at, error_message, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          id,
          salonId,
          bookingId,
          job.to,
          messageType,
          job.messageSid ?? null,
          status,
          job.sentAt ? new Date(job.sentAt) : null,
          job.lastError ?? null,
          job.createdAt ? new Date(job.createdAt) : new Date(),
        ]
      );
    });
  }
}

async function main(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  if (!isS3CmsConfigured()) {
    console.error('S3 CMS env vars are not set (cannot read cmsSite).');
    process.exit(1);
  }

  console.log(DRY_RUN ? 'DRY RUN — no writes' : 'Migrating S3 cmsSite → PostgreSQL…');

  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('Could not read site from S3.');
    process.exit(1);
  }

  await withPgClient(async (client) => {
    if (!DRY_RUN) await client.query('BEGIN');
    try {
      const salonId = await upsertSalon(client, site);
      console.log('Salon:', salonId);

      const categoryIds = await upsertCategories(client, salonId, site.services);
      console.log('Categories:', categoryIds.size);

      const serviceByKey = await upsertServices(client, salonId, categoryIds, site.services);
      console.log('Services:', site.services.length);

      const employeeIds = await upsertEmployees(client, salonId, site.employees);
      console.log('Employees:', site.employees.length);

      await upsertEmployeeServices(client, site.employees, employeeIds, site.services, serviceByKey);

      const customerIds = await upsertCustomersFromBookings(client, salonId, site.bookings);
      console.log('Customers:', customerIds.size);

      await upsertBookings(client, salonId, site, customerIds, employeeIds, serviceByKey);
      console.log('Bookings:', site.bookings.length);

      await upsertGallery(client, salonId, site);
      console.log('Gallery:', site.gallery.length);

      await upsertBookingBlocks(client, salonId, site, employeeIds);
      console.log('Booking blocks:', site.bookingBlocks.length);

      await upsertSmsLogs(client, salonId, site);
      console.log('SMS jobs:', site.smsJobs.length);

      if (!DRY_RUN) await client.query('COMMIT');
    } catch (e) {
      if (!DRY_RUN) await client.query('ROLLBACK');
      throw e;
    }
  });

  console.log('Done. S3 cmsSite unchanged; live site still uses S3.');
  await disconnectPgPool();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
