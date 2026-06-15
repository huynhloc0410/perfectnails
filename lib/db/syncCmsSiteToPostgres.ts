/**
 * Sync CmsSitePayload → PostgreSQL (gallery + legacy migration paths).
 * When Postgres owns bookings/scheduling, those sections are not synced from S3.
 */
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import type { CmsBooking, CmsEmployee, CmsService, CmsSitePayload } from '@/lib/cmsSiteTypes';
import {
  employeeCanPerformService,
  isNonBookableAddonService,
} from '@/lib/booking/serviceEmployeeMatch';
import { isDatabaseConfigured, isDualWriteToDbEnabled, isAdminSiteConfigFromPostgres, isBookingsManagedInPostgres } from '@/lib/db/config';
import { compactLegacyId, customerLegacyId, customerPhoneDigits10, customerPhoneStored, galleryLegacyId } from '@/lib/db/legacyId';
import { withPgClient } from '@/lib/db/pool';

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

async function mappedOrNew(
  client: PoolClient,
  entityType: string,
  legacyId: string
): Promise<string> {
  const existing = await getMappedUuid(client, entityType, legacyId);
  if (existing) return existing;
  const uuid = randomUUID();
  await rememberMapping(client, entityType, legacyId, uuid);
  return uuid;
}

/** Reuse first salon when a rolled-back txn cleared legacy_id_mappings. */
async function resolveSalonId(client: PoolClient): Promise<string> {
  const mapped = await getMappedUuid(client, 'salon', SALON_LEGACY_ID);
  if (mapped) return mapped;

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM salons WHERE deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
  );
  if (existing.rows[0]?.id) {
    const id = existing.rows[0].id;
    await rememberMapping(client, 'salon', SALON_LEGACY_ID, id);
    return id;
  }

  return mappedOrNew(client, 'salon', SALON_LEGACY_ID);
}

async function resolveCategoryId(
  client: PoolClient,
  salonId: string,
  legacyId: string,
  categoryName: string
): Promise<string> {
  const mapped = await getMappedUuid(client, 'category', legacyId);
  if (mapped) return mapped;

  const byName = await client.query<{ id: string }>(
    `SELECT id FROM categories
     WHERE salon_id = $1 AND lower(trim(name)) = lower(trim($2)) AND deleted_at IS NULL
     LIMIT 1`,
    [salonId, categoryName]
  );
  if (byName.rows[0]?.id) {
    const id = byName.rows[0].id;
    await rememberMapping(client, 'category', legacyId, id);
    return id;
  }

  return mappedOrNew(client, 'category', legacyId);
}

/** cmsSite may have duplicate service names with different ids — one PG row per name. */
async function resolveServiceId(
  client: PoolClient,
  salonId: string,
  legacyId: string,
  serviceName: string
): Promise<string> {
  const mapped = await getMappedUuid(client, 'service', legacyId);
  if (mapped) return mapped;

  const byName = await client.query<{ id: string }>(
    `SELECT id FROM services
     WHERE salon_id = $1 AND lower(trim(name)) = lower(trim($2)) AND deleted_at IS NULL
     LIMIT 1`,
    [salonId, serviceName]
  );
  if (byName.rows[0]?.id) {
    const id = byName.rows[0].id;
    await rememberMapping(client, 'service', legacyId, id);
    return id;
  }

  return mappedOrNew(client, 'service', legacyId);
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
      await rememberMapping(client, 'customer', legacyId, id);
      return id;
    }
  }

  return mappedOrNew(client, 'customer', legacyId);
}

async function syncSalon(client: PoolClient, site: CmsSitePayload): Promise<string> {
  const title = site.about?.title?.trim() || 'Perfect Nails & Spa';
  const salonId = await resolveSalonId(client);

  await client.query(
    `INSERT INTO salons (id, name, phone, email, address, timezone)
     VALUES ($1, $2, $3, $4, $5, 'America/Phoenix')
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       email = EXCLUDED.email,
       address = EXCLUDED.address,
       updated_at = NOW()`,
    [
      salonId,
      title,
      site.contact.phone || null,
      site.contact.email || null,
      site.contact.address || null,
    ]
  );

  await client.query(
    `INSERT INTO business_settings (salon_id, settings_json)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (salon_id) DO UPDATE SET
       settings_json = EXCLUDED.settings_json,
       updated_at = NOW()`,
    [
      salonId,
      JSON.stringify({
        about: site.about,
        contact: site.contact,
        cms_version: site.version,
        cmsEmployees: site.employees,
      }),
    ]
  );

  return salonId;
}

async function syncCategories(
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
  for (const [name, order] of Array.from(names.entries())) {
    const legacyId = categoryLegacyId(name);
    const id = await resolveCategoryId(client, salonId, legacyId, name);
    await client.query(
      `INSERT INTO categories (id, salon_id, name, display_order, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         display_order = EXCLUDED.display_order,
         is_active = TRUE,
         deleted_at = NULL,
         updated_at = NOW()`,
      [id, salonId, name, order]
    );
    idByName.set(name, id);
  }
  return idByName;
}

async function syncServices(
  client: PoolClient,
  salonId: string,
  categoryIds: Map<string, string>,
  services: CmsService[]
): Promise<Map<string, CmsService & { pgId: string }>> {
  const byKey = new Map<string, CmsService & { pgId: string }>();

  for (let i = 0; i < services.length; i++) {
    const s = services[i];
    const catName = (s.category || 'General').trim() || 'General';
    const categoryId = categoryIds.get(catName);
    if (!categoryId) continue;

    const legacyId = s.id || `service-name:${s.name}`;
    const id = await resolveServiceId(client, salonId, legacyId, s.name);
    const online = !isNonBookableAddonService(s);

    await client.query(
      `INSERT INTO services (
         id, salon_id, category_id, name, description,
         duration_minutes, price, display_order, online_booking_enabled, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         duration_minutes = EXCLUDED.duration_minutes,
         price = EXCLUDED.price,
         display_order = EXCLUDED.display_order,
         online_booking_enabled = EXCLUDED.online_booking_enabled,
         is_active = TRUE,
         deleted_at = NULL,
         updated_at = NOW()`,
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

    const row = { ...s, pgId: id };
    byKey.set(legacyId, row);
    byKey.set(s.name.trim().toLowerCase(), row);
  }
  return byKey;
}

async function syncEmployees(
  client: PoolClient,
  salonId: string,
  employees: CmsEmployee[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  for (let i = 0; i < employees.length; i++) {
    const e = employees[i];
    const legacyId = e.id || e.name;
    const id = await mappedOrNew(client, 'employee', legacyId);

    await client.query(
      `INSERT INTO employees (
         id, salon_id, first_name, nickname, phone, display_order, employment_status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         nickname = EXCLUDED.nickname,
         phone = EXCLUDED.phone,
         display_order = EXCLUDED.display_order,
         employment_status = 'active',
         deleted_at = NULL,
         updated_at = NOW()`,
      [id, salonId, e.name, e.name, e.phone || null, i]
    );

    map.set(legacyId, id);
    map.set(e.name.trim().toLowerCase(), id);
  }
  return map;
}

async function syncEmployeeServices(
  client: PoolClient,
  salonId: string,
  employees: CmsEmployee[],
  employeeIds: Map<string, string>,
  services: CmsService[],
  serviceByKey: Map<string, CmsService & { pgId: string }>
): Promise<void> {
  await client.query(
    `DELETE FROM employee_services
     WHERE employee_id IN (SELECT id FROM employees WHERE salon_id = $1)`,
    [salonId]
  );

  for (const e of employees) {
    const empLegacy = e.id || e.name;
    const employeeId = employeeIds.get(empLegacy);
    if (!employeeId) continue;

    for (const s of services) {
      if (isNonBookableAddonService(s)) continue;
      if (!employeeCanPerformService(e, s)) continue;
      const svc = serviceByKey.get(s.id || `service-name:${s.name}`);
      if (!svc) continue;

      await client.query(
        `INSERT INTO employee_services (employee_id, service_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [employeeId, svc.pgId]
      );
    }
  }
}

async function syncCustomers(
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

    await client.query(
      `INSERT INTO customers (id, salon_id, name, phone, sms_opt_in)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         updated_at = NOW()`,
      [id, salonId, customerDisplayName(b.name), phoneStored]
    );
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

async function syncBookings(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload,
  customerIds: Map<string, string>,
  employeeIds: Map<string, string>,
  serviceByKey: Map<string, CmsService & { pgId: string }>
): Promise<{ keepBookingIds: string[]; cmsLegacyIds: string[] }> {
  const keepBookingIds: string[] = [];
  const cmsLegacyIds: string[] = [];

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

    const bookingId = await mappedOrNew(client, 'booking', legacyId);
    keepBookingIds.push(bookingId);
    cmsLegacyIds.push(legacyId);

    await client.query(
      `INSERT INTO bookings (
         id, salon_id, customer_id, booking_number, status,
         appointment_date, start_datetime, end_datetime, notes, guest_name,
         subtotal, total
       ) VALUES ($1, $2, $3, $4, 'confirmed', $5, $6, $7, $8, $9, $10, $10)
       ON CONFLICT (id) DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         appointment_date = EXCLUDED.appointment_date,
         start_datetime = EXCLUDED.start_datetime,
         end_datetime = EXCLUDED.end_datetime,
         notes = EXCLUDED.notes,
         guest_name = EXCLUDED.guest_name,
         subtotal = EXCLUDED.subtotal,
         total = EXCLUDED.total,
         updated_at = NOW()`,
      [
        bookingId,
        salonId,
        customerId,
        bookingNumber,
        apptDate,
        start,
        end,
        b.notes?.trim() || null,
        customerDisplayName(b.name),
        price,
      ]
    );

    const bsLegacy = `bs:${legacyId}`;
    const bsId = await mappedOrNew(client, 'booking_service', bsLegacy);

    await client.query(
      `INSERT INTO booking_services (
         id, booking_id, service_id, service_name,
         price_at_booking, duration_at_booking
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         service_id = EXCLUDED.service_id,
         service_name = EXCLUDED.service_name,
         price_at_booking = EXCLUDED.price_at_booking,
         duration_at_booking = EXCLUDED.duration_at_booking`,
      [bsId, bookingId, svc?.pgId ?? null, b.service.trim(), price, duration]
    );

    await client.query(
      `DELETE FROM booking_assignments WHERE booking_service_id = $1`,
      [bsId]
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
  }

  return { keepBookingIds, cmsLegacyIds };
}

async function syncGallery(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload
): Promise<void> {
  const keepIds: string[] = [];

  for (let i = 0; i < site.gallery.length; i++) {
    const g = site.gallery[i];
    const legacyId = galleryLegacyId(g.full);
    const id = await mappedOrNew(client, 'gallery', legacyId);
    keepIds.push(id);

    await client.query(
      `INSERT INTO gallery_photos (id, salon_id, image_url, thumbnail_url, display_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         image_url = EXCLUDED.image_url,
         thumbnail_url = EXCLUDED.thumbnail_url,
         display_order = EXCLUDED.display_order,
         deleted_at = NULL,
         updated_at = NOW()`,
      [id, salonId, g.full, g.thumb || g.full, i]
    );
  }

  if (keepIds.length === 0) {
    await client.query(
      `UPDATE gallery_photos SET deleted_at = NOW()
       WHERE salon_id = $1 AND deleted_at IS NULL`,
      [salonId]
    );
  } else {
    await client.query(
      `UPDATE gallery_photos SET deleted_at = NOW()
       WHERE salon_id = $1 AND id <> ALL($2::uuid[]) AND deleted_at IS NULL`,
      [salonId, keepIds]
    );
  }
}

async function syncBookingBlocks(
  client: PoolClient,
  salonId: string,
  site: CmsSitePayload,
  employeeIds: Map<string, string>
): Promise<void> {
  const keepIds: string[] = [];

  for (const block of site.bookingBlocks) {
    const legacyId = block.id;
    const id = await mappedOrNew(client, 'booking_block', legacyId);
    keepIds.push(id);

    const employeeId = block.employeeId
      ? employeeIds.get(block.employeeId) ?? null
      : null;

    await client.query(
      `INSERT INTO salon_booking_blocks (
         id, salon_id, employee_id, block_date, start_time, end_time, salon_wide
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         employee_id = EXCLUDED.employee_id,
         block_date = EXCLUDED.block_date,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         salon_wide = EXCLUDED.salon_wide`,
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
  }

  if (keepIds.length === 0) {
    await client.query(`DELETE FROM salon_booking_blocks WHERE salon_id = $1`, [salonId]);
  } else {
    await client.query(
      `DELETE FROM salon_booking_blocks WHERE salon_id = $1 AND id <> ALL($2::uuid[])`,
      [salonId, keepIds]
    );
  }
}

async function syncSmsLogs(client: PoolClient, salonId: string, site: CmsSitePayload): Promise<void> {
  const keepIds: string[] = [];

  for (const job of site.smsJobs) {
    const legacyId = job.id;
    const id = await mappedOrNew(client, 'sms_job', legacyId);
    keepIds.push(id);
    const messageType =
      job.kind === 'booking_confirmation' ? 'confirmation' : 'reminder';
    const status =
      job.status === 'sent' ? 'sent' : job.status === 'error' ? 'failed' : 'queued';

    let bookingId: string | null = null;
    if (job.bookingId) {
      bookingId = await getMappedUuid(client, 'booking', job.bookingId);
    }

    await client.query(
      `INSERT INTO sms_logs (
         id, salon_id, booking_id, phone_number, message_type,
         twilio_sid, status, sent_at, error_message, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         twilio_sid = EXCLUDED.twilio_sid,
         sent_at = EXCLUDED.sent_at,
         error_message = EXCLUDED.error_message`,
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
  }

  if (keepIds.length === 0) {
    await client.query(`DELETE FROM sms_logs WHERE salon_id = $1`, [salonId]);
  } else {
    await client.query(
      `DELETE FROM sms_logs WHERE salon_id = $1 AND id <> ALL($2::uuid[])`,
      [salonId, keepIds]
    );
  }

  const smsKeys = site.smsJobs.map((j) => compactLegacyId(j.id));
  if (smsKeys.length === 0) {
    await client.query(`DELETE FROM legacy_id_mappings WHERE entity_type = 'sms_job'`);
  } else {
    await client.query(
      `DELETE FROM legacy_id_mappings
       WHERE entity_type = 'sms_job' AND legacy_id <> ALL($1::varchar[])`,
      [smsKeys]
    );
  }
}

async function syncCmsSiteToPostgresInternal(
  client: PoolClient,
  site: CmsSitePayload
): Promise<void> {
  const salonId = await syncSalon(client, site);
  const schedulingInPostgres = isAdminSiteConfigFromPostgres();
  const bookingsInPostgres = isBookingsManagedInPostgres();

  let employeeIds = new Map<string, string>();
  let serviceByKey = new Map<string, CmsService & { pgId: string }>();

  if (!schedulingInPostgres) {
    const categoryIds = await syncCategories(client, salonId, site.services);
    serviceByKey = await syncServices(client, salonId, categoryIds, site.services);
    employeeIds = await syncEmployees(client, salonId, site.employees);
    await syncEmployeeServices(
      client,
      salonId,
      site.employees,
      employeeIds,
      site.services,
      serviceByKey
    );
    await syncBookingBlocks(client, salonId, site, employeeIds);
  } else if (!bookingsInPostgres) {
    const categoryIds = await syncCategories(client, salonId, site.services);
    serviceByKey = await syncServices(client, salonId, categoryIds, site.services);
    employeeIds = await syncEmployees(client, salonId, site.employees);
  }

  if (!bookingsInPostgres) {
    const customerIds = await syncCustomers(client, salonId, site.bookings);
    await syncBookings(client, salonId, site, customerIds, employeeIds, serviceByKey);
  }

  await syncGallery(client, salonId, site);

  if (!bookingsInPostgres && site.smsJobs.length > 0) {
    await syncSmsLogs(client, salonId, site);
  }
}

/** Sync full cmsSite snapshot to Postgres. No-op when DATABASE_URL unset or CMS_WRITE_DB=false. */
export async function syncCmsSiteToPostgres(site: CmsSitePayload): Promise<void> {
  if (!isDualWriteToDbEnabled()) return;

  await withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      await syncCmsSiteToPostgresInternal(client, site);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}

async function updateCmsEmployeesSnapshot(
  client: PoolClient,
  salonId: string,
  employees: CmsEmployee[]
): Promise<void> {
  const snapshot = employees.map((e) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    phone: e.phone,
  }));
  await client.query(
    `INSERT INTO business_settings (salon_id, settings_json)
     VALUES ($1, jsonb_build_object('cmsEmployees', $2::jsonb))
     ON CONFLICT (salon_id) DO UPDATE SET
       settings_json = COALESCE(business_settings.settings_json, '{}'::jsonb)
         || jsonb_build_object('cmsEmployees', $2::jsonb),
       updated_at = NOW()`,
    [salonId, JSON.stringify(snapshot)]
  );
}

/** Phase 4: sync services, employees, blocks only — does not touch bookings or smsJobs. */
async function syncSchedulingConfigInternal(
  client: PoolClient,
  site: Pick<CmsSitePayload, 'services' | 'employees' | 'bookingBlocks'>
): Promise<void> {
  const salonId = await resolveSalonId(client);
  const categoryIds = await syncCategories(client, salonId, site.services);
  const serviceByKey = await syncServices(client, salonId, categoryIds, site.services);
  const employeeIds = await syncEmployees(client, salonId, site.employees);

  await syncEmployeeServices(
    client,
    salonId,
    site.employees,
    employeeIds,
    site.services,
    serviceByKey
  );

  const keepServiceIds = Array.from(
    new Set(Array.from(serviceByKey.values()).map((s) => s.pgId))
  );
  if (keepServiceIds.length === 0) {
    await client.query(
      `UPDATE services SET deleted_at = NOW(), is_active = FALSE
       WHERE salon_id = $1 AND deleted_at IS NULL`,
      [salonId]
    );
  } else {
    await client.query(
      `UPDATE services SET deleted_at = NOW(), is_active = FALSE
       WHERE salon_id = $1 AND deleted_at IS NULL AND id <> ALL($2::uuid[])`,
      [salonId, keepServiceIds]
    );
  }

  const keepEmployeeIds = Array.from(new Set(Array.from(employeeIds.values())));
  if (keepEmployeeIds.length === 0) {
    await client.query(
      `UPDATE employees SET deleted_at = NOW(), employment_status = 'terminated'
       WHERE salon_id = $1 AND deleted_at IS NULL`,
      [salonId]
    );
  } else {
    await client.query(
      `UPDATE employees SET deleted_at = NOW(), employment_status = 'terminated'
       WHERE salon_id = $1 AND deleted_at IS NULL AND id <> ALL($2::uuid[])`,
      [salonId, keepEmployeeIds]
    );
  }

  await updateCmsEmployeesSnapshot(client, salonId, site.employees);
  await syncBookingBlocks(
    client,
    salonId,
    { bookingBlocks: site.bookingBlocks } as CmsSitePayload,
    employeeIds
  );
}

/** Admin Phase 4 write path for scheduling config (services, employees, booking blocks). */
export async function syncSchedulingConfigToPostgres(
  site: Pick<CmsSitePayload, 'services' | 'employees' | 'bookingBlocks'>
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }

  await withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      await syncSchedulingConfigInternal(client, site);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}
