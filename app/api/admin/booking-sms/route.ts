import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { normalizePhoneE164 } from '@/lib/phone';
import { bookingReminderSms } from '@/lib/smsTemplates';
import { isTwilioConfigured, sendSms } from '@/lib/twilioServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'Twilio is not configured on the server' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const name = String(o.name ?? '').trim();
  const phone = String(o.phone ?? '').trim();
  const service = String(o.service ?? '').trim();
  const isoDate = String(o.isoDate ?? '').trim();

  if (!name || !phone || !service || !isoDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const appt = new Date(isoDate);
  if (!Number.isFinite(appt.getTime())) {
    return NextResponse.json({ error: 'Invalid appointment date' }, { status: 400 });
  }

  const to = normalizePhoneE164(phone);
  if (!to) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
  }

  const text = bookingReminderSms({ name, isoDate, service });

  try {
    const out = await sendSms({ to, body: text });
    return NextResponse.json({ ok: true, messageSid: out.sid });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to send SMS';
    console.error('Admin booking reminder SMS failed:', e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
