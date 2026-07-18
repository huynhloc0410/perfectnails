import type { CmsBookingBlock } from '@/lib/cmsSiteTypes';
import { salonDateTimeToUtc } from '@/lib/db/timezone';

/** True when this interval should suppress booking for everyone (stylist IDs ignored). */
export function isSalonWideBookingBlock(block: CmsBookingBlock): boolean {
  const v = block.salonWide as unknown;
  if (v === true) return true;
  if (v === 1) return true;
  if (v === '1') return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', 'yes', '1', 'salon', 'all', 'whole_salon'].includes(s)) return true;
  }
  return false;
}

/**
 * Whether `block` should be applied when evaluating `employeeId`:
 * salon-wide affects every stylist; stylist-only affects just that employee.
 * Unknown / empty stylist ⇒ stylist-only blocks are ignored (still used for overlap on public API via explicit id).
 */
function bookingBlockAppliesToEmployee(block: CmsBookingBlock, employeeId: string): boolean {
  if (isSalonWideBookingBlock(block)) return true;
  const bid = (block.employeeId || '').trim();
  if (!bid) return false;
  const sid = employeeId.trim();
  if (!sid) return false;
  return bid === sid;
}

function hmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Half-open overlap: interval A [t0,t1), B [b0,b1) ⇔ t0 < b1 && t1 > b0 */
export function intervalsOverlapExclusiveEnd(
  t0Ms: number,
  t1Ms: number,
  b0Ms: number,
  b1Ms: number,
): boolean {
  return t0Ms < b1Ms && t1Ms > b0Ms;
}

/**
 * True if appointment window [slotStart, slotEndExclusive) overlaps a blocked interval on dateYmd.
 *
 * Block window is half-open [startTime, endTime) in salon-local clock time.
 *
 * Matching rules:
 * - `salonWide` blocks apply to every stylist (and to unassigned “Anyone” requests on the server).
 * - Stylist-only blocks apply only when `employeeId` matches; skipped when stylist is unknown (Anyone).
 */
export function isBookingWindowBlocked(opts: {
  dateYmd: string;
  /**
   * Stylist booking this slot. Empty means “Anyone” / unassigned — only salon-wide blocks apply.
   */
  employeeId: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  blocks: CmsBookingBlock[];
}): boolean {
  const { dateYmd, employeeId, slotStartLocal, slotEndExclusiveLocal, blocks } = opts;
  const t0 = slotStartLocal.getTime();
  const t1 = slotEndExclusiveLocal.getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;

  for (const block of blocks) {
    if (block.date !== dateYmd) continue;

    if (!bookingBlockAppliesToEmployee(block, employeeId)) continue;

    const sm = hmToMinutes(block.startTime);
    const em = hmToMinutes(block.endTime);
    if (sm === null || em === null || em <= sm) continue;

    const bStartDate = salonDateTimeToUtc(dateYmd, block.startTime);
    const bEndDate = salonDateTimeToUtc(dateYmd, block.endTime);
    if (!bStartDate || !bEndDate) continue;

    if (intervalsOverlapExclusiveEnd(t0, t1, bStartDate.getTime(), bEndDate.getTime())) return true;
  }

  return false;
}

/** True iff the proposal overlaps a salon-wide block (used for UX messaging — “whole salon”). */
export function overlapsSalonWideBookingWindow(opts: {
  dateYmd: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  blocks: CmsBookingBlock[];
}): boolean {
  const { dateYmd, slotStartLocal, slotEndExclusiveLocal, blocks } = opts;
  const t0 = slotStartLocal.getTime();
  const t1 = slotEndExclusiveLocal.getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;

  for (const block of blocks) {
    if (block.date !== dateYmd || !isSalonWideBookingBlock(block)) continue;
    const sm = hmToMinutes(block.startTime);
    const em = hmToMinutes(block.endTime);
    if (sm === null || em === null || em <= sm) continue;
    const bStartDate = salonDateTimeToUtc(dateYmd, block.startTime);
    const bEndDate = salonDateTimeToUtc(dateYmd, block.endTime);
    if (!bStartDate || !bEndDate) continue;
    if (intervalsOverlapExclusiveEnd(t0, t1, bStartDate.getTime(), bEndDate.getTime())) return true;
  }
  return false;
}

/**
 * True iff window overlaps any stylist-specific (non–salon-wide) block targeting `employeeId`.
 */
export function overlapsStylistScopedBookingWindow(opts: {
  dateYmd: string;
  employeeId: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  blocks: CmsBookingBlock[];
}): boolean {
  const { dateYmd, employeeId, slotStartLocal, slotEndExclusiveLocal, blocks } = opts;
  if (!employeeId.trim()) return false;
  const t0 = slotStartLocal.getTime();
  const t1 = slotEndExclusiveLocal.getTime();
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return false;

  for (const block of blocks) {
    if (block.date !== dateYmd || isSalonWideBookingBlock(block)) continue;
    if (!bookingBlockAppliesToEmployee(block, employeeId)) continue;

    const sm = hmToMinutes(block.startTime);
    const em = hmToMinutes(block.endTime);
    if (sm === null || em === null || em <= sm) continue;
    const bStartDate = salonDateTimeToUtc(dateYmd, block.startTime);
    const bEndDate = salonDateTimeToUtc(dateYmd, block.endTime);
    if (!bStartDate || !bEndDate) continue;
    if (intervalsOverlapExclusiveEnd(t0, t1, bStartDate.getTime(), bEndDate.getTime())) return true;
  }
  return false;
}
