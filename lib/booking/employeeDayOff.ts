import { normalizeCmsBookingBlock, type CmsBookingBlock } from '@/lib/cmsSiteTypes';
import { salonDayOfWeekFromYmd } from '@/lib/db/timezone';

/** Full operating window so weekday (to 7pm) and Saturday (to 6pm) slots are covered. */
export const EMPLOYEE_DAY_OFF_START = '09:00';
export const EMPLOYEE_DAY_OFF_END = '19:00';

/** Inclusive calendar days (Sundays count toward the cap, but are not stored). */
export const EMPLOYEE_DAY_OFF_MAX_CALENDAR_DAYS = 90;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function utcYmd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function inclusiveCalendarDayCount(fromYmd: string, toYmd: string): number | null {
  if (!YMD_RE.test(fromYmd) || !YMD_RE.test(toYmd) || toYmd < fromYmd) return null;
  const [y1, m1, d1] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Open salon days (Mon–Sat) from fromYmd through toYmd inclusive. */
export function eachOpenSalonYmdInInclusiveRange(fromYmd: string, toYmd: string): string[] {
  if (!YMD_RE.test(fromYmd) || !YMD_RE.test(toYmd) || toYmd < fromYmd) return [];
  const [y, m, d] = fromYmd.split('-').map(Number);
  const [y2, m2, d2] = toYmd.split('-').map(Number);
  const endMs = Date.UTC(y2, m2 - 1, d2);
  const days: string[] = [];
  for (let ms = Date.UTC(y, m - 1, d); ms <= endMs; ms += 86_400_000) {
    const ymd = utcYmd(new Date(ms));
    if (salonDayOfWeekFromYmd(ymd) === 0) continue;
    days.push(ymd);
  }
  return days;
}

export function isExistingEmployeeDayOff(
  block: CmsBookingBlock,
  employeeId: string,
  dateYmd: string,
): boolean {
  if (block.salonWide) return false;
  if ((block.employeeId || '').trim() !== employeeId.trim()) return false;
  if (block.date !== dateYmd) return false;
  return block.startTime === EMPLOYEE_DAY_OFF_START && block.endTime === EMPLOYEE_DAY_OFF_END;
}

export type EmployeeDayOffPlan =
  | { ok: false; error: 'employee' | 'dates' | 'order' | 'too_long' | 'sunday_only' }
  | { ok: true; dates: string[]; skippedDuplicates: number };

export function planEmployeeDayOff(opts: {
  employeeId: string;
  fromYmd: string;
  toYmd: string;
  existing: CmsBookingBlock[];
}): EmployeeDayOffPlan {
  const employeeId = opts.employeeId.trim();
  const fromYmd = opts.fromYmd.trim();
  const toYmd = opts.toYmd.trim();
  if (!employeeId) return { ok: false, error: 'employee' };
  if (!YMD_RE.test(fromYmd) || !YMD_RE.test(toYmd)) return { ok: false, error: 'dates' };
  if (toYmd < fromYmd) return { ok: false, error: 'order' };
  const span = inclusiveCalendarDayCount(fromYmd, toYmd);
  if (span === null || span > EMPLOYEE_DAY_OFF_MAX_CALENDAR_DAYS) {
    return { ok: false, error: 'too_long' };
  }
  const openDays = eachOpenSalonYmdInInclusiveRange(fromYmd, toYmd);
  if (openDays.length === 0) return { ok: false, error: 'sunday_only' };

  const dates: string[] = [];
  let skippedDuplicates = 0;
  for (const dateYmd of openDays) {
    const already = opts.existing.some((b) => isExistingEmployeeDayOff(b, employeeId, dateYmd));
    if (already) {
      skippedDuplicates += 1;
      continue;
    }
    dates.push(dateYmd);
  }
  return { ok: true, dates, skippedDuplicates };
}

export function buildEmployeeDayOffBlock(opts: {
  id: string;
  employeeId: string;
  dateYmd: string;
}): CmsBookingBlock | null {
  return normalizeCmsBookingBlock({
    id: opts.id,
    date: opts.dateYmd,
    startTime: EMPLOYEE_DAY_OFF_START,
    endTime: EMPLOYEE_DAY_OFF_END,
    salonWide: false,
    scope: 'stylist',
    employeeId: opts.employeeId,
  });
}
