import { createHash } from 'crypto';
import { normalizePhoneE164 } from '@/lib/phone';

/** DB column limit for legacy_id_mappings.legacy_id */
export const LEGACY_ID_MAX_LEN = 128;

/** S3 gallery URLs and other keys can exceed 128 chars — hash to a stable short id. */
export function compactLegacyId(legacyId: string): string {
  const s = legacyId.trim();
  if (s.length <= LEGACY_ID_MAX_LEN) return s;
  const hash = createHash('sha256').update(s).digest('hex').slice(0, 56);
  return `h:${hash}`;
}

export function galleryLegacyId(fullUrl: string): string {
  return compactLegacyId(`gallery:${fullUrl.trim()}`);
}

/** Last 10 NANP digits for matching (6239869199). */
export function customerPhoneDigits10(raw: string): string {
  const e164 = normalizePhoneE164(raw);
  const digits = (e164 ?? String(raw ?? '')).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return String(raw ?? '').replace(/\D/g, '') || raw.trim();
}

/** Prefer E.164 for storage; fallback to digits-only. */
export function customerPhoneStored(raw: string): string {
  return normalizePhoneE164(raw) ?? customerPhoneDigits10(raw);
}

export function customerLegacyId(raw: string): string {
  return compactLegacyId(`phone:${customerPhoneDigits10(raw)}`);
}
