import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import {
  coerceBookingBlocksList,
  normalizeCmsSite,
  type CmsEmployee,
  type CmsService,
} from '@/lib/cmsSiteTypes';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import {
  loadAdminSiteConfigFromPostgres,
  saveAdminSiteConfigToPostgres,
} from '@/lib/db/adminSiteConfig';
import { isAdminSiteConfigFromPostgres, isDatabaseConfigured } from '@/lib/db/config';

export const dynamic = 'force-dynamic';

function parseEmployees(raw: unknown): CmsEmployee[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((e) => ({
      id: String(e.id ?? ''),
      name: String(e.name ?? ''),
      role: (e.role === 'Water' || e.role === 'Powder' || e.role === 'Everything'
        ? e.role
        : 'Everything') as CmsEmployee['role'],
      phone: String(e.phone ?? ''),
    }))
    .filter((e) => e.id && e.name);
}

function parseServices(raw: unknown): CmsService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((s) => ({
      id: String(s.id ?? ''),
      name: String(s.name ?? ''),
      description: String(s.description ?? ''),
      price: typeof s.price === 'number' ? s.price : parseFloat(String(s.price ?? '0')) || 0,
      category: String(s.category ?? 'General'),
      duration:
        typeof s.duration === 'number' && s.duration >= 0
          ? s.duration
          : parseInt(String(s.duration ?? '45'), 10) || 45,
    }))
    .filter((s) => s.id && s.name);
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

  if (!isAdminSiteConfigFromPostgres()) {
    return NextResponse.json(
      { source: 'cms', configured: false, reason: 'CMS_ADMIN_SITE_CONFIG_SOURCE=s3' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    const config = await loadAdminSiteConfigFromPostgres();
    return NextResponse.json(
      { source: 'postgres', configured: true, ...config },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/admin/site-config:', e);
    return NextResponse.json(
      { error: 'Failed to load site config from database', configured: true },
      { status: 502, headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isDatabaseConfigured() || !isAdminSiteConfigFromPostgres()) {
    return NextResponse.json({ error: 'Postgres site config not enabled' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const normalized = normalizeCmsSite({
    version: 1,
    services: parseServices(raw.services),
    employees: parseEmployees(raw.employees),
    bookingBlocks: coerceBookingBlocksList(
      Array.isArray(raw.bookingBlocks) ? raw.bookingBlocks : []
    ),
    bookings: [],
    smsJobs: [],
    about: { title: '', description: '' },
    contact: { phone: '', email: '', address: '' },
    gallery: [],
  });

  try {
    await saveAdminSiteConfigToPostgres({
      services: normalized.services,
      employees: normalized.employees,
      bookingBlocks: normalized.bookingBlocks,
    });
    return NextResponse.json({ ok: true, source: 'postgres' });
  } catch (e) {
    console.error('PUT /api/admin/site-config:', e);
    return NextResponse.json({ error: 'Failed to save site config' }, { status: 502 });
  }
}
