/**
 * Rewrite S3 cms/site.json to gallery-only (Postgres owns everything else).
 *
 *   npm run cms:strip-s3-site
 */
import { toS3CmsDocument } from '../lib/cms/s3CmsDocument';
import { isS3GalleryOnlyStorage } from '../lib/db/config';
import { isS3CmsConfigured, readCmsSiteFromS3, writeCmsSiteToS3 } from '../lib/s3CmsSite';

async function main() {
  if (!isS3CmsConfigured()) {
    console.error('S3 CMS is not configured.');
    process.exit(1);
  }
  if (!isS3GalleryOnlyStorage()) {
    console.error('Site is not in gallery-only S3 mode — check DATABASE_URL and CMS_* flags.');
    process.exit(1);
  }

  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('No cms/site.json in S3.');
    process.exit(1);
  }

  const before = JSON.stringify(site).length;
  await writeCmsSiteToS3(site);
  const afterDoc = toS3CmsDocument(site);
  const after = JSON.stringify(afterDoc).length;
  console.log(
    `S3 cms/site.json is now gallery-only (${site.gallery.length} image(s), ${before} → ${after} bytes).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
