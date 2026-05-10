/** Local-calendar helpers for admin week navigation (Mon–Sat open days in UI). */

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** Monday of the ISO-style week (Mon–Sun) in local time. */
export function mondayOfWeek(containing: Date): Date {
  const sod = startOfLocalDay(containing);
  const dow = sod.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addDays(sod, offset);
}

export function toISODateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODateLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export const WEEKDAY_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Mon–Sat labels for booking calendar (Sunday closed). */
export const WEEKDAY_SHORT_MON_SAT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Business week for booking UI: Monday through Saturday only. */
export function getOpenWeekDayDatesMonSat(monday: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
}

export function formatCardDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatWeekRangeLabel(monday: Date, sunday: Date): string {
  const sameMonth =
    monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear();
  if (sameMonth) {
    const month = monday.toLocaleDateString('en-US', { month: 'long' });
    const y = monday.getFullYear();
    return `${month} ${monday.getDate()} – ${month} ${sunday.getDate()}, ${y}`;
  }
  const left = monday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const right = sunday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${left} – ${right}`;
}

export function getWeekDayDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
