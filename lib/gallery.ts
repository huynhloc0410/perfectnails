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

/** Normalize URL for images. Relative paths stay site-relative so server HTML matches the browser. */
export function resolveGalleryImageSrc(url: string): string {
  return (url || '').trim();
}

/** Local files and the salon S3/CloudFront hosts can go through the Next image optimizer. */
export function isOptimizableImageSrc(src: string): boolean {
  const u = (src || '').trim();
  if (!u || u.startsWith('data:')) return false;
  if (u.startsWith('/')) return true;
  try {
    const host = new URL(u).hostname;
    return host.endsWith('.amazonaws.com') || host.endsWith('.cloudfront.net');
  } catch {
    return false;
  }
}

export const GALLERY_PAGE_SIZE = 36;
