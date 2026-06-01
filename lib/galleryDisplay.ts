import type { CmsGalleryImage } from '@/lib/cmsSiteTypes';

export function galleryThumbSrc(item: CmsGalleryImage): string {
  return (item.thumb || item.full).trim();
}

export function galleryFullSrc(item: CmsGalleryImage): string {
  return item.full.trim();
}

/** True when thumb is a separate WebP under `/thumb/` (not legacy full-only). */
export function galleryHasDedicatedThumb(item: CmsGalleryImage): boolean {
  const thumb = item.thumb.trim();
  const full = item.full.trim();
  return thumb !== full && thumb.includes('/thumb/');
}
