import { sortGalleryNewestFirst } from '@/lib/gallery';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '@/lib/s3CmsSite';

/** Gallery URLs for SSR (skips client /api/cms/site round-trip when S3 CMS is configured). */
export async function getServerGalleryImages(): Promise<string[]> {
  if (!isS3CmsConfigured()) return [];
  try {
    const site = await readCmsSiteFromS3();
    const raw = site?.gallery;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const urls = raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    return sortGalleryNewestFirst(urls);
  } catch {
    return [];
  }
}
