import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rawSecret = process.env.ADMIN_PATH_SECRET;
  const secret = (rawSecret || '').trim().replace(/^\/+|\/+$/g, '');
  const secretBase = secret ? `/admin/${secret}` : '';
  const secretLogin = secret ? `${secretBase}/login` : '/admin/login';

  // Optional "private admin URL": only /admin/<secret> is accessible.
  // We rewrite /admin/<secret>/... → /admin/... internally so the existing routes keep working.
  // If a secret is set, direct /admin and /admin/login will 404 (obscurity layer; auth still applies).
  if (secret && pathname.startsWith('/admin') && !pathname.startsWith(secretBase)) {
    // Let API admin routes keep working (they're protected below).
    if (!pathname.startsWith('/api/')) {
      const url = request.nextUrl.clone();
      url.pathname = '/_not-found';
      return NextResponse.rewrite(url);
    }
  }

  const effectivePathname =
    secret && pathname.startsWith(secretBase) ? pathname.replace(secretBase, '/admin') : pathname;

  if (effectivePathname === '/admin/login') {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (token && (await verifyAdminToken(token))) {
      return NextResponse.redirect(new URL(secret ? secretBase : '/admin', request.url));
    }
    if (secret && pathname.startsWith(secretBase)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (effectivePathname.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.redirect(new URL(secretLogin, request.url));
    }
    if (secret && pathname.startsWith(secretBase)) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
