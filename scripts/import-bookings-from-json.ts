/**
 * Import bookings from a JSON file (e.g. exported from browser localStorage admin-bookings).
 *
 * Export in browser console on your admin site:
 *   copy(localStorage.getItem('admin-bookings'))
 * Paste into a file, e.g. local-bookings.json
 *
 *   export DATABASE_URL='postgresql://...'
 *   npm run db:import-bookings -- ./local-bookings.json --dry-run
 *   npm run db:import-bookings -- ./local-bookings.json
 *   npm run db:import-bookings -- ./local-bookings.json --from 2026-06-13
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CmsBooking } from '../lib/cmsSiteTypes';
import { salonAppointmentDate } from '../lib/db/timezone';
import { customerPhoneDigits10 } from '../lib/db/legacyId';
import { isDatabaseConfigured } from '../lib/db/config';
import { listAdminBookingsFromPostgres } from '../lib/db/adminBookings';
import { createOnlineBookingInPostgres } from '../lib/db/createOnlineBooking';
import { normalizePhoneE164 } from '../lib/phone';

function usage(): never {
  console.error(`Usage: npm run db:import-bookings -- <file.json> [--dry-run] [--from YYYY-MM-DD]

  --dry-run       Print what would be imported without writing
  --from DATE     Only appointments on or after this day (Phoenix salon time)
`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let dryRun = false;
  let fromDate: string | null = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--from') {
      const d = argv[++i];
      if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) usage();
      fromDate = d;
    } else if (a.startsWith('--')) usage();
    else positional.push(a);
  }

  if (positional.length !== 1) usage();
  return { file: resolve(positional[0]), dryRun, fromDate };
}

function normalizeRow(raw: unknown, index: number): CmsBooking | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const id = String(b.id ?? '').trim();
  const name = String(b.name ?? '').trim();
  const phone = String(b.phone ?? '').trim();
  const service = String(b.service ?? '').trim();
  const date = String(b.date ?? '').trim();
  const timeSlot = String(b.timeSlot ?? '').trim();
  if (!id || !name || !phone || !service || !date) {
    console.warn(`Skip row ${index}: missing id, name, phone, service, or date`);
    return null;
  }
  const durationRaw = b.duration;
  const duration =
    typeof durationRaw === 'number' && durationRaw > 0
      ? durationRaw
      : parseInt(String(durationRaw ?? ''), 10) || 45;

  return {
    id,
    name,
    phone,
    service,
    date,
    timeSlot: timeSlot || '09:00',
    duration,
    ...(typeof b.employee === 'string' && b.employee.trim()
      ? { employee: b.employee.trim() }
      : {}),
    ...(typeof b.notes === 'string' && b.notes.trim() ? { notes: b.notes.trim() } : {}),
  };
}

function bookingSlotKey(b: CmsBooking): string {
  const d = new Date(b.date);
  const day = Number.isFinite(d.getTime()) ? salonAppointmentDate(d) : '';
  const phone = customerPhoneDigits10(b.phone);
  const time = (b.timeSlot || '').trim() || '00:00';
  return `${phone}|${day}|${time}`;
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const { file, dryRun, fromDate } = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('JSON file must be an array of bookings.');
    process.exit(1);
  }

  const rows: CmsBooking[] = [];
  raw.forEach((item, i) => {
    const b = normalizeRow(item, i);
    if (b) rows.push(b);
  });

  let candidates = rows;
  if (fromDate) {
    candidates = rows.filter((b) => {
      const d = new Date(b.date);
      if (!Number.isFinite(d.getTime())) return false;
      return salonAppointmentDate(d) >= fromDate;
    });
  }

  const existing = await listAdminBookingsFromPostgres();
  const existingIds = new Set(existing.map((b) => b.id));
  const existingSlots = new Set(existing.map((b) => bookingSlotKey(b)));

  const toImport = candidates.filter((b) => {
    if (existingIds.has(b.id)) return false;
    if (existingSlots.has(bookingSlotKey(b))) {
      console.warn(`Skip ${b.id}: slot already in DB (${b.name} ${bookingSlotKey(b)})`);
      return false;
    }
    return true;
  });
  const alreadyInDb = candidates.length - toImport.length;

  console.log(`File: ${file}`);
  console.log(`Parsed: ${rows.length} booking(s)`);
  if (fromDate) console.log(`From ${fromDate} (Phoenix): ${candidates.length} booking(s)`);
  console.log(`Already in Postgres: ${alreadyInDb}`);
  console.log(`To import: ${toImport.length}`);

  if (toImport.length === 0) {
    console.log('\nNothing to import.');
    return;
  }

  console.log('\nPreview:');
  for (const b of toImport.slice(0, 20)) {
    const day = salonAppointmentDate(new Date(b.date));
    console.log(`  ${day} ${b.timeSlot} | ${b.name} | ${b.service}`);
  }
  if (toImport.length > 20) console.log(`  ... and ${toImport.length - 20} more`);

  if (dryRun) {
    console.log('\nDry run — no changes written.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const booking of toImport) {
    try {
      await createOnlineBookingInPostgres({
        booking,
        phoneE164: normalizePhoneE164(booking.phone),
      });
      ok++;
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`FAIL ${booking.id} (${booking.name}): ${msg}`);
    }
  }

  console.log(`\nDone. Imported: ${ok}, failed: ${fail}`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
