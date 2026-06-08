import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import type { CmsAbout, CmsContact } from '@/lib/cmsSiteTypes';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import {
  loadAdminSiteContentFromPostgres,
  saveAdminSiteContentToPostgres,
} from '@/lib/db/adminSiteContent';
import { isAdminContentFromPostgres, isDatabaseConfigured } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

function parseAbout(raw: unknown): CmsAbout {
  if (!raw || typeof raw !== 'object') return { title: 'About Us', content: '' };
  const o = raw as Record<string, unknown>;
  return {
    title: String(o.title ?? 'About Us').trim() || 'About Us',
    content: String(o.content ?? '').trim(),
  };
}

function parseContact(raw: unknown): CmsContact {
  const empty: CmsContact = {
    address: '',
    phone: '',
    email: '',
    hours: '',
    socialMedia: { facebook: '', instagram: '', yelp: '' },
  };
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  const sm =
    o.socialMedia && typeof o.socialMedia === 'object'
      ? (o.socialMedia as Record<string, unknown>)
      : {};
  return {
    address: String(o.address ?? '').trim(),
    phone: String(o.phone ?? '').trim(),
    email: String(o.email ?? '').trim(),
    hours: String(o.hours ?? '').trim(),
    socialMedia: {
      facebook: String(sm.facebook ?? '').trim(),
      instagram: String(sm.instagram ?? '').trim(),
      yelp: String(sm.yelp ?? '').trim(),
    },
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { source: 'cms', configured: false, reason: 'DATABASE_URL not set' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  if (!isAdminContentFromPostgres()) {
    return NextResponse.json(
      { source: 'cms', configured: false, reason: 'CMS_ADMIN_CONTENT_SOURCE=s3' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    const content = await loadAdminSiteContentFromPostgres();
    return NextResponse.json(
      { source: 'postgres', configured: true, ...content },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/admin/site-content:', e);
    return NextResponse.json(
      { error: 'Failed to load content from database', configured: true },
      { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured() || !isAdminContentFromPostgres()) {
    return NextResponse.json({ error: 'Postgres content not enabled' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  try {
    await saveAdminSiteContentToPostgres({
      about: parseAbout(raw.about),
      contact: parseContact(raw.contact),
    });
    return NextResponse.json({ ok: true, source: 'postgres' });
  } catch (e) {
    console.error('PUT /api/admin/site-content:', e);
    return NextResponse.json({ error: 'Failed to save content' }, { status: 502 });
  }
}
