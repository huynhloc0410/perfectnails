import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import {
  type CmsSitePayload,
  defaultCmsSite,
  normalizeCmsSite,
} from '@/lib/cmsSiteTypes';

/** First non-empty trimmed value among env keys (copy/paste from other projects often uses different names). */
function s3Env(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v.trim() !== '') return v.trim();
  }
  return undefined;
}

/** Which S3-related env groups are still missing (for debugging — no values exposed). */
export function s3EnvMissingParts(): string[] {
  const missing: string[] = [];
  if (!s3Env('AWS_ACCESS_KEY_ID')) missing.push('AWS_ACCESS_KEY_ID');
  if (!s3Env('AWS_SECRET_ACCESS_KEY')) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!s3Env('AWS_REGION', 'AWS_DEFAULT_REGION')) {
    missing.push('AWS_REGION_or_AWS_DEFAULT_REGION');
  }
  if (
    !s3Env(
      'AWS_S3_BUCKET_NAME',
      'S3_BUCKET_NAME',
      'S3_BUCKET',
      'AWS_S3_BUCKET',
      'BUCKET_NAME'
    )
  ) {
    missing.push('AWS_S3_BUCKET_NAME_or_S3_BUCKET_NAME');
  }
  return missing;
}

export function isS3CmsConfigured(): boolean {
  return s3EnvMissingParts().length === 0;
}

function getClient(): S3Client | null {
  if (!isS3CmsConfigured()) return null;
  return new S3Client({
    region: s3Env('AWS_REGION', 'AWS_DEFAULT_REGION'),
    credentials: {
      accessKeyId: s3Env('AWS_ACCESS_KEY_ID')!,
      secretAccessKey: s3Env('AWS_SECRET_ACCESS_KEY')!,
    },
  });
}

/** S3 object key, e.g. cms/site.json or my-prefix/perfectnails/site.json */
export function cmsSiteObjectKey(): string {
  return s3Env('S3_SITE_OBJECT_KEY') || 'cms/site.json';
}

function bucket(): string {
  return s3Env(
    'AWS_S3_BUCKET_NAME',
    'S3_BUCKET_NAME',
    'S3_BUCKET',
    'AWS_S3_BUCKET',
    'BUCKET_NAME'
  )!;
}

export async function readCmsSiteFromS3(): Promise<CmsSitePayload | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const out = await client.send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: cmsSiteObjectKey(),
      })
    );
    const text = await out.Body?.transformToString();
    if (!text) return defaultCmsSite();
    const parsed = JSON.parse(text) as unknown;
    return normalizeCmsSite(parsed);
  } catch (e: unknown) {
    const name = e && typeof e === 'object' && 'name' in e ? (e as { name: string }).name : '';
    if (name === 'NoSuchKey') return defaultCmsSite();
    const status =
      e && typeof e === 'object' && '$metadata' in e
        ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    if (status === 404) return defaultCmsSite();
    throw e;
  }
}

export async function writeCmsSiteToS3(site: CmsSitePayload): Promise<void> {
  const client = getClient();
  if (!client) throw new Error('S3 CMS is not configured');

  const body = JSON.stringify(site);
  if (body.length > 2_000_000) {
    throw new Error('Site payload too large');
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: cmsSiteObjectKey(),
      Body: body,
      ContentType: 'application/json; charset=utf-8',
      CacheControl: 'no-store',
    })
  );
}

/** Prefix for gallery images (no leading slash; trailing slash optional). */
export function galleryUploadPrefix(): string {
  const p = s3Env('S3_GALLERY_PREFIX') || 'perfectnails/gallery';
  return p.replace(/\/$/, '');
}

/** Public URL for an object key (needs bucket policy or CDN allowing GetObject). */
export function publicUrlForS3ObjectKey(key: string): string {
  const encoded = key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  const cdn = s3Env('AWS_CDN_URL', 'S3_PUBLIC_BASE_URL');
  if (cdn) {
    return `${cdn.replace(/\/$/, '')}/${encoded}`;
  }
  const b = bucket();
  const r = s3Env('AWS_REGION', 'AWS_DEFAULT_REGION')!;
  return `https://${b}.s3.${r}.amazonaws.com/${encoded}`;
}

/** Upload a gallery image; returns HTTPS URL for <img src>. */
export async function uploadPublicGalleryImage(params: {
  buffer: Buffer;
  contentType: string;
  originalName: string;
}): Promise<string> {
  const client = getClient();
  if (!client) throw new Error('S3 not configured');

  const prefix = galleryUploadPrefix();
  const safe = params.originalName.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image';
  const key = `${prefix}/${Date.now()}-${safe}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: params.buffer,
      ContentType: params.contentType || 'application/octet-stream',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return publicUrlForS3ObjectKey(key);
}
