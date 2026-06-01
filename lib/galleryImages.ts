import 'server-only';

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { CmsGalleryImage } from '@/lib/cmsSiteTypes';
import { galleryHasDedicatedThumb } from '@/lib/galleryDisplay';
import { buildGalleryThumbWebp } from '@/lib/galleryImageProcessing';
import {
  galleryUploadPrefix,
  getS3ClientAndBucket,
  publicUrlForS3ObjectKey,
  publicUrlToS3Key,
} from '@/lib/s3CmsSite';

export function thumbS3KeyForFullKey(fullKey: string): string {
  const normalized = fullKey.replace(/\\/g, '/');
  if (normalized.includes('/thumb/')) return normalized;

  const slash = normalized.lastIndexOf('/');
  const dir = slash >= 0 ? normalized.slice(0, slash) : galleryUploadPrefix();
  const file = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const base = file.replace(/\.[^.]+$/, '') || file;
  return `${dir}/thumb/${base}.webp`;
}

async function getS3ObjectBuffer(key: string): Promise<Buffer> {
  const ctx = getS3ClientAndBucket();
  if (!ctx) throw new Error('S3 not configured');

  const out = await ctx.client.send(
    new GetObjectCommand({ Bucket: ctx.bucket, Key: key })
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes?.length) throw new Error(`Empty object: ${key}`);
  return Buffer.from(bytes);
}

async function putS3Object(key: string, body: Buffer, contentType: string): Promise<void> {
  const ctx = getS3ClientAndBucket();
  if (!ctx) throw new Error('S3 not configured');

  await ctx.client.send(
    new PutObjectCommand({
      Bucket: ctx.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
}

/** Create thumb in S3 for one legacy full-only gallery entry. */
export async function generateThumbForGalleryItem(item: CmsGalleryImage): Promise<CmsGalleryImage> {
  if (galleryHasDedicatedThumb(item)) return item;

  const fullKey = publicUrlToS3Key(item.full);
  if (!fullKey) throw new Error(`Could not parse S3 key from URL: ${item.full}`);

  const source = await getS3ObjectBuffer(fullKey);
  const thumbBuffer = await buildGalleryThumbWebp(source);
  const thumbKey = thumbS3KeyForFullKey(fullKey);
  await putS3Object(thumbKey, thumbBuffer, 'image/webp');

  return {
    full: item.full,
    thumb: publicUrlForS3ObjectKey(thumbKey),
  };
}

export type GalleryMigrateBatchResult = {
  gallery: CmsGalleryImage[];
  processed: number;
  remaining: number;
  errors: string[];
};

/** Process up to `batchSize` items missing dedicated thumbs (for admin migration). */
export async function migrateGalleryThumbsBatch(
  gallery: CmsGalleryImage[],
  batchSize: number
): Promise<GalleryMigrateBatchResult> {
  const cap = Math.max(1, Math.min(batchSize, 10));
  const next = gallery.map((item) => ({ ...item }));
  const errors: string[] = [];
  let processed = 0;

  for (let i = 0; i < next.length && processed < cap; i++) {
    if (galleryHasDedicatedThumb(next[i])) continue;
    try {
      next[i] = await generateThumbForGalleryItem(next[i]);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`#${i + 1}: ${msg}`);
    }
  }

  const remaining = next.filter((item) => !galleryHasDedicatedThumb(item)).length;
  return { gallery: next, processed, remaining, errors };
}
