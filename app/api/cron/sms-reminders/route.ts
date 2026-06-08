import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = req.headers.get('x-cron-secret')?.trim();
  return header === secret;
}

/** Automated SMS reminders are disabled; confirmations still send on booking create. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    reminders: 'disabled',
    processed: 0,
    sent: 0,
    errored: 0,
  });
}
