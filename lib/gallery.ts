import type { CmsGalleryImage } from '@/lib/cmsSiteTypes';

/** Sort gallery newest-first using upload timestamp in S3/local keys. */
export function extractGalleryUploadTimestampMs(url: string): number | null {
  const cleaned = (url || '').split('?')[0];
  const matches = Array.from(cleaned.matchAll(/\/(\d+)-/g));
  const last = matches[matches.length - 1]?.[1];
  if (!last) return null;
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

export function sortGalleryNewestFirst(images: CmsGalleryImage[]): CmsGalleryImage[] {
  return images
    .map((item, index) => ({
      item,
      index,
      ts: extractGalleryUploadTimestampMs(item.full),
    }))
    .sort((a, b) => {
      const aTs = a.ts ?? -1;
      const bTs = b.ts ?? -1;
      if (bTs !== aTs) return bTs - aTs;
      return a.index - b.index;
    })
    .map((x) => x.item);
}

/** Normalize URL for <img> (relative paths stay site-relative). */
export function resolveGalleryImageSrc(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (typeof window !== 'undefined' && u.startsWith('/')) {
    return `${window.location.origin}${u}`;
  }
  return u;
}

export const GALLERY_PAGE_SIZE = 36;
