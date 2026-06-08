import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured, isPublicBookingWriteToPostgres } from '@/lib/db/config';
import { processPostgresDueReminders } from '@/lib/db/processSmsReminders';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '@/lib/s3CmsSite';
import { persistCmsSite } from '@/lib/cms/persistCmsSite';
import type { CmsSmsJob } from '@/lib/cmsSiteTypes';
import { parseReminderHoursBefore, pruneOrphanSmsJobs } from '@/lib/bookingReminderJobs';
import { bookingReminderSms } from '@/lib/smsTemplates';
import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('x-cron-secret')?.trim();
  return header === secret;
}

async function processS3Reminders(): Promise<{ processed: number; sent: number; errored: number }> {
  if (!isS3CmsConfigured() || !isTwilioConfigured()) {
    return { processed: 0, sent: 0, errored: 0 };
  }

  const site = await readCmsSiteFromS3();
  if (!site) return { processed: 0, sent: 0, errored: 0 };

  const now = new Date();
  const jobs = pruneOrphanSmsJobs(
    Array.isArray(site.smsJobs) ? site.smsJobs : [],
    site.bookings
  );
  site.smsJobs = jobs;
  const due: CmsSmsJob[] = jobs
    .filter((j) => j && j.kind === 'booking_reminder' && j.status === 'pending')
    .filter((j) => {
      const t = new Date(j.sendAt);
      return Number.isFinite(t.getTime()) && t.getTime() <= now.getTime();
    })
    .slice(0, 25);

  if (due.length === 0) {
    return { processed: 0, sent: 0, errored: 0 };
  }

  let processed = 0;
  let sent = 0;
  let errored = 0;
  const updatedAt = now.toISOString();

  for (const job of due) {
    processed += 1;
    const booking = job.bookingId ? site.bookings.find((b) => b.id === job.bookingId) : undefined;
    const name = booking?.name || 'there';
    const isoDate = booking?.date || job.sendAt;
    const hoursBefore = parseReminderHoursBefore(job.id);
    const body = bookingReminderSms({
      name,
      isoDate,
      service: booking?.service ?? 'your appointment',
      hoursBefore: hoursBefore === 24 || hoursBefore === 2 ? hoursBefore : undefined,
    });

    try {
      const out = await sendSms({ to: job.to, body });
      job.status = 'sent';
      job.sentAt = updatedAt;
      job.messageSid = out.sid;
      job.lastError = undefined;
      job.updatedAt = updatedAt;
      sent += 1;
    } catch (e) {
      job.status = 'error';
      job.lastError = e instanceof Error ? e.message : 'Failed to send reminder SMS';
      job.updatedAt = updatedAt;
      errored += 1;
      console.error('Reminder SMS failed:', { jobId: job.id, err: e });
    }
  }

  site.smsJobs = jobs;
  await persistCmsSite(site);
  return { processed, sent, errored };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 });
  }

  let pg = { processed: 0, sent: 0, errored: 0 };
  let s3 = { processed: 0, sent: 0, errored: 0 };

  if (isDatabaseConfigured()) {
    pg = await processPostgresDueReminders(25);
  }

  // Legacy S3 smsJobs (older bookings) until fully migrated
  if (!isPublicBookingWriteToPostgres() || isS3CmsConfigured()) {
    s3 = await processS3Reminders();
  }

  return NextResponse.json({
    ok: true,
    postgres: pg,
    s3,
    processed: pg.processed + s3.processed,
    sent: pg.sent + s3.sent,
    errored: pg.errored + s3.errored,
  });
}
