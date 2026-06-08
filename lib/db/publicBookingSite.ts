import type { PoolClient } from 'pg';
import type {
  CmsBooking,
  CmsBookingBlock,
  CmsEmployee,
  CmsService,
} from '@/lib/cmsSiteTypes';
import { listAdminBookingsFromPostgres } from '@/lib/db/adminBookings';
import { getDefaultSalonId } from '@/lib/db/salon';
import { withPgClient } from '@/lib/db/pool';

export type PublicBookingSitePayload = {
  services: CmsService[];
  employees: CmsEmployee[];
  bookings: CmsBooking[];
  bookingBlocks: CmsBookingBlock[];
};

type CmsEmployeeSnapshot = {
  id?: string;
  name?: string;
  role?: string;
  phone?: string;
};

function formatPgTime(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(raw ?? '').trim());
  if (!m) return String(raw ?? '').trim();
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function formatPgDate(raw: string | Date): string {
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw ?? '').trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseCmsEmployeesSnapshot(settings: unknown): CmsEmployeeSnapshot[] {
  if (!settings || typeof settings !== 'object') return [];
  const cmsEmployees = (settings as { cmsEmployees?: unknown }).cmsEmployees;
  if (!Array.isArray(cmsEmployees)) return [];
  return cmsEmployees
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((e) => ({
      id: e.id != null ? String(e.id) : undefined,
      name: e.name != null ? String(e.name) : undefined,
      role: e.role != null ? String(e.role) : undefined,
      phone: e.phone != null ? String(e.phone) : undefined,
    }));
}

function normalizeEmployeeRole(role: string | undefined): CmsEmployee['role'] {
  const r = String(role ?? '').trim().toLowerCase();
  if (r === 'water') return 'Water';
  if (r === 'powder' || r === 'power' || r === 'acrylic') return 'Powder';
  return 'Everything';
}

async function loadServices(client: PoolClient, salonId: string): Promise<CmsService[]> {
  const r = await client.query<{
    legacy_id: string | null;
    name: string;
    description: string | null;
    price: string;
    duration_minutes: number;
    category: string;
    display_order: number;
  }>(
    `SELECT
       sm.legacy_id,
       s.name,
       s.description,
       s.price::text AS price,
       s.duration_minutes,
       c.name AS category,
       s.display_order
     FROM services s
     JOIN categories c ON c.id = s.category_id
     LEFT JOIN legacy_id_mappings sm ON sm.entity_type = 'service' AND sm.uuid = s.id
     WHERE s.salon_id = $1
       AND s.deleted_at IS NULL
       AND s.is_active = TRUE
     ORDER BY s.display_order ASC, s.name ASC`,
    [salonId]
  );

  return r.rows.map((row, i) => ({
    id: row.legacy_id?.trim() || `pg-service-${i}`,
    name: row.name,
    description: row.description?.trim() || '',
    price: parseFloat(row.price) || 0,
    category: row.category?.trim() || 'General',
    duration: row.duration_minutes > 0 ? row.duration_minutes : 45,
  }));
}

async function loadEmployees(
  client: PoolClient,
  salonId: string,
  snapshot: CmsEmployeeSnapshot[]
): Promise<CmsEmployee[]> {
  const byLegacyId = new Map<string, CmsEmployeeSnapshot>();
  for (const e of snapshot) {
    if (e.id) byLegacyId.set(e.id, e);
  }

  const r = await client.query<{
    legacy_id: string | null;
    name: string;
    phone: string | null;
    display_order: number;
  }>(
    `SELECT
       em.legacy_id,
       COALESCE(NULLIF(e.nickname, ''), e.first_name) AS name,
       e.phone,
       e.display_order
     FROM employees e
     LEFT JOIN legacy_id_mappings em ON em.entity_type = 'employee' AND em.uuid = e.id
     WHERE e.salon_id = $1
       AND e.deleted_at IS NULL
       AND e.employment_status = 'active'
     ORDER BY e.display_order ASC, e.first_name ASC`,
    [salonId]
  );

  const out: CmsEmployee[] = [];
  r.rows.forEach((row, i) => {
    const legacyId = row.legacy_id?.trim() || `pg-employee-${i}`;
    const snap = byLegacyId.get(legacyId);
    out.push({
      id: legacyId,
      name: snap?.name?.trim() || row.name?.trim() || 'Staff',
      role: normalizeEmployeeRole(snap?.role),
      phone: snap?.phone?.trim() || row.phone?.trim() || '',
    });
  });
  return out;
}

async function loadBookingBlocks(client: PoolClient, salonId: string): Promise<CmsBookingBlock[]> {
  const r = await client.query<{
    legacy_id: string | null;
    block_date: string | Date;
    start_time: string;
    end_time: string;
    salon_wide: boolean;
    employee_legacy_id: string | null;
  }>(
    `SELECT
       bm.legacy_id,
       bb.block_date,
       bb.start_time::text AS start_time,
       bb.end_time::text AS end_time,
       bb.salon_wide,
       em.legacy_id AS employee_legacy_id
     FROM salon_booking_blocks bb
     LEFT JOIN legacy_id_mappings bm ON bm.entity_type = 'booking_block' AND bm.uuid = bb.id
     LEFT JOIN legacy_id_mappings em ON em.entity_type = 'employee' AND em.uuid = bb.employee_id
     WHERE bb.salon_id = $1
     ORDER BY bb.block_date ASC, bb.start_time ASC`,
    [salonId]
  );

  const blocks: CmsBookingBlock[] = [];
  r.rows.forEach((row, i) => {
    const id = row.legacy_id?.trim() || `pg-block-${i}`;
    const date = formatPgDate(row.block_date);
    const startTime = formatPgTime(row.start_time);
    const endTime = formatPgTime(row.end_time);
    if (!date || !startTime || !endTime) return;

    if (row.salon_wide) {
      blocks.push({ id, date, startTime, endTime, salonWide: true });
    } else if (row.employee_legacy_id?.trim()) {
      blocks.push({
        id,
        date,
        startTime,
        endTime,
        salonWide: false,
        employeeId: row.employee_legacy_id.trim(),
      });
    }
  });
  return blocks;
}

export async function loadPublicBookingSiteFromPostgres(): Promise<PublicBookingSitePayload> {
  const bookings = await listAdminBookingsFromPostgres();

  return withPgClient(async (client) => {
    const salonId = await getDefaultSalonId(client);

    const settingsRes = await client.query<{ settings_json: unknown }>(
      `SELECT settings_json FROM business_settings WHERE salon_id = $1`,
      [salonId]
    );
    const settings = settingsRes.rows[0]?.settings_json;

    let employeeSnapshot = parseCmsEmployeesSnapshot(settings);
    if (employeeSnapshot.length === 0) {
      const { readCmsSiteFromS3, isS3CmsConfigured } = await import('@/lib/s3CmsSite');
      if (isS3CmsConfigured()) {
        const cms = await readCmsSiteFromS3();
        if (cms?.employees?.length) {
          employeeSnapshot = cms.employees.map((e) => ({
            id: e.id,
            name: e.name,
            role: e.role,
            phone: e.phone,
          }));
        }
      }
    }

    const [services, employees, bookingBlocks] = await Promise.all([
      loadServices(client, salonId),
      loadEmployees(client, salonId, employeeSnapshot),
      loadBookingBlocks(client, salonId),
    ]);

    return { services, employees, bookings, bookingBlocks };
  });
}
