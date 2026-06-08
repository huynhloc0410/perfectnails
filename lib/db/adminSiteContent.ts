import type { CmsAbout, CmsContact } from '@/lib/cmsSiteTypes';
import { getDefaultSalonId } from '@/lib/db/salon';
import { withPgClient } from '@/lib/db/pool';
import { loadPublicSiteContentFromPostgres } from '@/lib/db/publicSiteContent';

export type AdminSiteContentPayload = {
  about: CmsAbout;
  contact: CmsContact;
};

export async function loadAdminSiteContentFromPostgres(): Promise<AdminSiteContentPayload> {
  const { about, contact } = await loadPublicSiteContentFromPostgres();
  return { about, contact };
}

export async function saveAdminSiteContentToPostgres(
  content: AdminSiteContentPayload
): Promise<void> {
  await withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const salonId = await getDefaultSalonId(client);
      const title = content.about.title?.trim() || 'Perfect Nails & Spa';

      await client.query(
        `UPDATE salons SET
           name = $2,
           phone = $3,
           email = $4,
           address = $5,
           updated_at = NOW()
         WHERE id = $1`,
        [
          salonId,
          title,
          content.contact.phone?.trim() || null,
          content.contact.email?.trim() || null,
          content.contact.address?.trim() || null,
        ]
      );

      await client.query(
        `INSERT INTO business_settings (salon_id, settings_json)
         VALUES ($1, jsonb_build_object('about', $2::jsonb, 'contact', $3::jsonb))
         ON CONFLICT (salon_id) DO UPDATE SET
           settings_json = COALESCE(business_settings.settings_json, '{}'::jsonb)
             || jsonb_build_object('about', $2::jsonb, 'contact', $3::jsonb),
           updated_at = NOW()`,
        [salonId, JSON.stringify(content.about), JSON.stringify(content.contact)]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  });
}
