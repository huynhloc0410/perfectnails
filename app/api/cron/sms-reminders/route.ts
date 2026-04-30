import { NextRequest, NextResponse } from 'next/server';
import { isS3CmsConfigured, readCmsSiteFromS3, writeCmsSiteToS3 } from '@/lib/s3CmsSite';
import type { CmsSmsJob } from '@/lib/cmsSiteTypes';
import { bookingReminderSms } from '@/lib/smsTemplates';
import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('x-cron-secret')?.trim();
  return header === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isS3CmsConfigured()) {
    return NextResponse.json({ error: 'S3 CMS not configured' }, { status: 503 });
  }
  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 });
  }

  const site = await readCmsSiteFromS3();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const now = new Date();
  const jobs = Array.isArray(site.smsJobs) ? site.smsJobs : [];
  const due: CmsSmsJob[] = jobs
    .filter((j) => j && j.kind === 'booking_reminder' && j.status === 'pending')
    .filter((j) => {
      const t = new Date(j.sendAt);
      return Number.isFinite(t.getTime()) && t.getTime() <= now.getTime();
    })
    .slice(0, 25);

  if (due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
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
    const body = bookingReminderSms({ name, isoDate });

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

  // Persist updates
  site.smsJobs = jobs;
  await writeCmsSiteToS3(site);

  return NextResponse.json({ ok: true, processed, sent, errored });
}

