import { NextRequest, NextResponse } from 'next/server';
// Reminder SMS temporarily disabled:
// import { bookingReminderSms } from '@/lib/smsTemplates';
// import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('x-cron-secret')?.trim();
  return header === secret;
}

export async function POST(req: NextRequest) {
  // Reminder function temporarily disabled because phone verification isn't ready.
  return NextResponse.json({ ok: true, processed: 0, sent: 0, errored: 0, disabled: true });
}

