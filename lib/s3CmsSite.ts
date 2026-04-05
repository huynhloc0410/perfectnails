import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { runtimeEnv } from '@/lib/runtimeEnv';
import {
  type CmsSitePayload,
  defaultCmsSite,
  normalizeCmsSite,
} from '@/lib/cmsSiteTypes';

export function isS3CmsConfigured(): boolean {
  return Boolean(
    runtimeEnv('AWS_ACCESS_KEY_ID') &&
      runtimeEnv('AWS_SECRET_ACCESS_KEY') &&
      runtimeEnv('AWS_REGION') &&
      runtimeEnv('S3_BUCKET_NAME')
  );
}

function getClient(): S3Client | null {
  if (!isS3CmsConfigured()) return null;
  return new S3Client({
    region: runtimeEnv('AWS_REGION'),
    credentials: {
      accessKeyId: runtimeEnv('AWS_ACCESS_KEY_ID')!,
      secretAccessKey: runtimeEnv('AWS_SECRET_ACCESS_KEY')!,
    },
  });
}

/** S3 object key, e.g. cms/site.json or my-prefix/perfectnails/site.json */
export function cmsSiteObjectKey(): string {
  return runtimeEnv('S3_SITE_OBJECT_KEY') || 'cms/site.json';
}

function bucket(): string {
  return runtimeEnv('S3_BUCKET_NAME')!;
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
