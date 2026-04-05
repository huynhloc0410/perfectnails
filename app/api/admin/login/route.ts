import { NextRequest, NextResponse } from 'next/server';
import { timingSafePasswordEqual } from '@/lib/adminPassword';
import { ADMIN_SESSION_COOKIE, signAdminToken } from '@/lib/adminSessionSign';
import { adminPasswordFromEnv } from '@/lib/runtimeEnv';

export async function POST(req: NextRequest) {
  const configured = adminPasswordFromEnv();
  if (!configured) {
    return NextResponse.json(
      {
        error:
          'Admin login is not configured: ADMIN_PASSWORD is missing at runtime. On Render: Web Service → Environment → add ADMIN_PASSWORD (exact name) → Save → Manual Deploy. If it still fails, clear build cache and redeploy.',
      },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!timingSafePasswordEqual(password, configured)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = signAdminToken();
  if (!token) {
    return NextResponse.json({ error: 'Session signing failed' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
