import { SITE_HOURS_FALLBACK_SUMMARY } from '@/lib/site/branding';

/** Collapse multi-line CMS hours into one line for hero/footer summaries. */
export function summarizeHoursLabel(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return SITE_HOURS_FALLBACK_SUMMARY;
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return SITE_HOURS_FALLBACK_SUMMARY;
  if (lines.length === 1) return lines[0];
  return `${lines[0]} · ${lines[1]}`;
}
