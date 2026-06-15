import type { CmsBooking } from '@/lib/cmsSiteTypes';

/** Union booking lists; earlier lists win on duplicate id (Postgres should be first). */
export function mergeBookingLists(...lists: CmsBooking[][]): CmsBooking[] {
  const byId = new Map<string, CmsBooking>();
  for (const list of lists) {
    for (const b of list) {
      const id = String(b.id ?? '').trim();
      if (!id || byId.has(id)) continue;
      byId.set(id, b);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}
