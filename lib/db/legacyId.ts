import { createHash } from 'crypto';

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
