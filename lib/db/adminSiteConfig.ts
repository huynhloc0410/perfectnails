import type {
  CmsBookingBlock,
  CmsEmployee,
  CmsService,
} from '@/lib/cmsSiteTypes';
import { loadPublicBookingSiteFromPostgres } from '@/lib/db/publicBookingSite';
import { syncSchedulingConfigToPostgres } from '@/lib/db/syncCmsSiteToPostgres';

export type AdminSiteConfigPayload = {
  services: CmsService[];
  employees: CmsEmployee[];
  bookingBlocks: CmsBookingBlock[];
};

export async function loadAdminSiteConfigFromPostgres(): Promise<AdminSiteConfigPayload> {
  const site = await loadPublicBookingSiteFromPostgres();
  return {
    services: site.services,
    employees: site.employees,
    bookingBlocks: site.bookingBlocks,
  };
}

export async function saveAdminSiteConfigToPostgres(
  config: AdminSiteConfigPayload
): Promise<void> {
  await syncSchedulingConfigToPostgres(config);
}
