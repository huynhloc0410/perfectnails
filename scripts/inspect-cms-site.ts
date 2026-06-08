/**
 * Inspect cmsSite JSON in S3 (source of truth for the live site).
 *
 * Usage:
 *   npm run cms:inspect
 *   npm run cms:inspect -- --phone 6233022156
 *   npm run cms:inspect -- --phone "623 302 2156" --verbose
 */
import type { CmsBooking } from '../lib/cmsSiteTypes';
import { customerPhoneDigits10 } from '../lib/db/legacyId';
import { isS3CmsConfigured, readCmsSiteFromS3, s3EnvMissingParts, cmsSiteObjectKey } from '../lib/s3CmsSite';

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

function phoneMatches(booking: CmsBooking, digits10: string): boolean {
  return customerPhoneDigits10(booking.phone) === digits10;
}

function formatBooking(b: CmsBooking): string {
  const d = new Date(b.date);
  const when = Number.isFinite(d.getTime()) ? d.toISOString() : b.date;
  return `${when} | ${b.name} | ${b.phone} | ${b.service} | id=${b.id}`;
}

async function main(): Promise<void> {
  if (!isS3CmsConfigured()) {
    console.error('S3 not configured. Missing:', s3EnvMissingParts().join(', '));
    process.exit(1);
  }

  const phoneFilter = argValue('--phone');
  const digits10 = phoneFilter ? customerPhoneDigits10(phoneFilter) : null;
  const verbose = process.argv.includes('--verbose');

  console.info(`Reading S3 object: ${cmsSiteObjectKey()}`);
  const site = await readCmsSiteFromS3();
  if (!site) {
    console.error('Could not read cmsSite.');
    process.exit(1);
  }

  console.info('');
  console.info('--- cmsSite summary ---');
  console.info(`bookings:       ${site.bookings.length}`);
  console.info(`services:       ${site.services.length}`);
  console.info(`employees:      ${site.employees.length}`);
  console.info(`gallery:        ${site.gallery.length}`);
  console.info(`bookingBlocks:  ${site.bookingBlocks.length}`);
  console.info(`smsJobs:        ${site.smsJobs.length}`);

  if (digits10) {
    const matches = site.bookings.filter((b) => phoneMatches(b, digits10));
    console.info('');
    console.info(`--- bookings for phone (last 10: ${digits10}): ${matches.length} ---`);
    if (matches.length === 0) {
      console.info('(none — deleted from cmsSite or never existed)');
    } else {
      for (const b of matches.sort((a, c) => String(a.date).localeCompare(String(c.date)))) {
        console.info(formatBooking(b));
      }
    }
    return;
  }

  if (verbose) {
    console.info('');
    console.info('--- all bookings (oldest first) ---');
    const sorted = [...site.bookings].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    for (const b of sorted) {
      console.info(formatBooking(b));
    }
  } else {
    console.info('');
    console.info('Tip: npm run cms:inspect -- --phone 6233022156');
    console.info('Tip: npm run cms:inspect -- --verbose   (list every booking)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
