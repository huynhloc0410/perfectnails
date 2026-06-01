/** Sort gallery URLs newest-first using upload timestamp in S3/local keys. */
export function extractGalleryUploadTimestampMs(url: string): number | null {
  const cleaned = (url || '').split('?')[0];
  const matches = Array.from(cleaned.matchAll(/\/(\d+)-/g));
  const last = matches[matches.length - 1]?.[1];
  if (!last) return null;
  const n = Number(last);
  return Number.isFinite(n) ? n : null;
}

export function sortGalleryNewestFirst(images: string[]): string[] {
  return images
    .map((url, index) => ({
      url,
      index,
      ts: extractGalleryUploadTimestampMs(url),
    }))
    .sort((a, b) => {
      const aTs = a.ts ?? -1;
      const bTs = b.ts ?? -1;
      if (bTs !== aTs) return bTs - aTs;
      return a.index - b.index;
    })
    .map((x) => x.url);
}

/** Normalize gallery URL for <img> / next/image (relative paths stay site-relative). */
export function resolveGalleryImageSrc(url: string, origin?: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (u.startsWith('/') && origin) {
    return `${origin.replace(/\/$/, '')}${u}`;
  }
  return u;
}

/** Grid thumbnails: Next Image serves ~400px wide via `sizes`, not full uploads. */
export const GALLERY_THUMB_SIZES =
  '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

export const GALLERY_LIGHTBOX_SIZES = '(max-width: 1280px) 100vw, 1280px';

export const GALLERY_PAGE_SIZE = 24;
