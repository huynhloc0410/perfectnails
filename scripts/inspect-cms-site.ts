/**
 * Inspect gallery payload in S3 cms/site.json (gallery-only when DATABASE_URL is set).
 *
 *   npm run cms:inspect
 */
import { isS3CmsConfigured, readCmsSiteFromS3, s3EnvMissingParts, cmsSiteObjectKey } from '../lib/s3CmsSite';
import { isS3GalleryOnlyStorage } from '../lib/db/config';

async function main(): Promise<void> {
  if (!isS3CmsConfigured()) {
    console.error('S3 not configured. Missing:', s3EnvMissingParts().join(', '));
    process.exit(1);
  }

  console.info(`Reading S3 object: ${cmsSiteObjectKey()}`);
  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('Could not read cms/site.json.');
    process.exit(1);
  }

  console.info('');
  console.info('--- cms/site.json summary ---');
  console.info(`version:        ${site.version}`);
  console.info(`gallery:        ${site.gallery.length} image(s)`);
  if (!isS3GalleryOnlyStorage()) {
    console.info(`(legacy fields in memory) services: ${site.services.length}, employees: ${site.employees.length}`);
  }
  if (site.gallery.length > 0) {
    console.info('');
    console.info('Gallery URLs:');
    for (const g of site.gallery.slice(0, 10)) {
      console.info(`  ${g.full}`);
    }
    if (site.gallery.length > 10) {
      console.info(`  ... and ${site.gallery.length - 10} more`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
