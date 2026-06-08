import type { PoolClient } from 'pg';
import type { CmsAbout, CmsContact, CmsService } from '@/lib/cmsSiteTypes';
import { getDefaultSalonId } from '@/lib/db/salon';
import { withPgClient } from '@/lib/db/pool';

export type PublicSiteContentPayload = {
  services: CmsService[];
  about: CmsAbout;
  contact: CmsContact;
};

const DEFAULT_ABOUT: CmsAbout = { title: 'About Us', content: '' };

const DEFAULT_CONTACT: CmsContact = {
  address: '',
  phone: '',
  email: '',
  hours: '',
  socialMedia: { facebook: '', instagram: '', yelp: '' },
};

function parseAbout(raw: unknown): CmsAbout {
  if (!raw || typeof raw !== 'object') return DEFAULT_ABOUT;
  const o = raw as Record<string, unknown>;
  return {
    title: String(o.title ?? DEFAULT_ABOUT.title).trim() || DEFAULT_ABOUT.title,
    content: String(o.content ?? '').trim(),
  };
}

function parseContact(raw: unknown): CmsContact {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONTACT;
  const o = raw as Record<string, unknown>;
  const sm =
    o.socialMedia && typeof o.socialMedia === 'object'
      ? (o.socialMedia as Record<string, unknown>)
      : {};
  return {
    address: String(o.address ?? '').trim(),
    phone: String(o.phone ?? '').trim(),
    email: String(o.email ?? '').trim(),
    hours: String(o.hours ?? '').trim(),
    socialMedia: {
      facebook: String(sm.facebook ?? '').trim(),
      instagram: String(sm.instagram ?? '').trim(),
      yelp: String(sm.yelp ?? '').trim(),
    },
  };
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

export async function loadPublicSiteContentFromPostgres(): Promise<PublicSiteContentPayload> {
  return withPgClient(async (client) => {
    const salonId = await getDefaultSalonId(client);

    const [services, settingsRes, salonRes] = await Promise.all([
      loadServices(client, salonId),
      client.query<{ settings_json: unknown }>(
        `SELECT settings_json FROM business_settings WHERE salon_id = $1`,
        [salonId]
      ),
      client.query<{ name: string; phone: string | null; email: string | null; address: string | null }>(
        `SELECT name, phone, email, address FROM salons WHERE id = $1`,
        [salonId]
      ),
    ]);

    const settings = settingsRes.rows[0]?.settings_json;
    const settingsObj =
      settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {};

    let about = parseAbout(settingsObj.about);
    let contact = parseContact(settingsObj.contact);

    const salon = salonRes.rows[0];
    if (salon) {
      if (!contact.phone && salon.phone) contact = { ...contact, phone: salon.phone.trim() };
      if (!contact.email && salon.email) contact = { ...contact, email: salon.email.trim() };
      if (!contact.address && salon.address) contact = { ...contact, address: salon.address.trim() };
      if (!about.title && salon.name) about = { ...about, title: salon.name.trim() };
    }

    return { services, about, contact };
  });
}
