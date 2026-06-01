import 'server-only';

import sharp from 'sharp';

/** Max width for grid thumbnails (WebP). */
export const GALLERY_THUMB_MAX_WIDTH = 560;
export const GALLERY_THUMB_WEBP_QUALITY = 82;

/** Build a WebP thumbnail buffer from an uploaded or downloaded original. */
export async function buildGalleryThumbWebp(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .rotate()
    .resize({ width: GALLERY_THUMB_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: GALLERY_THUMB_WEBP_QUALITY })
    .toBuffer();
}
