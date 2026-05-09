import type { CmsBookingBlock } from '@/lib/cmsSiteTypes';

function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * True if appointment window [slotStart, slotEndExclusive) overlaps any block on dateYmd.
 * Interval is half-open on both sides to match cumulative slot checks (buffer folded into slot end).
 * Stylist-specific blocks are skipped when employeeId is empty (e.g. "Anyone" bookings).
 */
export function isBookingWindowBlocked(opts: {
  dateYmd: string;
  /** Empty when booking has no assigned stylist yet (skip per-stylist blocks). */
  employeeId: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  blocks: CmsBookingBlock[];
}): boolean {
  const { dateYmd, employeeId, slotStartLocal, slotEndExclusiveLocal, blocks } = opts;
  const t0 = slotStartLocal.getTime();
  const t1 = slotEndExclusiveLocal.getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;

  const y = slotStartLocal.getFullYear();
  const mo = slotStartLocal.getMonth();
  const d = slotStartLocal.getDate();

  for (const block of blocks) {
    if (block.date !== dateYmd) continue;
    const blockEmp = (block.employeeId || '').trim();
    if (blockEmp) {
      if (!employeeId.trim()) continue;
      if (blockEmp !== employeeId.trim()) continue;
    }
    const sm = hmToMinutes(block.startTime);
    const em = hmToMinutes(block.endTime);
    if (sm === null || em === null || em <= sm) continue;
    const bStart = new Date(y, mo, d, Math.floor(sm / 60), sm % 60, 0, 0).getTime();
    const bEnd = new Date(y, mo, d, Math.floor(em / 60), em % 60, 0, 0).getTime();
    if (t0 < bEnd && t1 > bStart) return true;
  }

  return false;
}
