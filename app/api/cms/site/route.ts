import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { defaultCmsSite, normalizeCmsSite } from '@/lib/cmsSiteTypes';
import {
  isS3CmsConfigured,
  readCmsSiteFromS3,
  s3EnvMissingParts,
  writeCmsSiteToS3,
} from '@/lib/s3CmsSite';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = isS3CmsConfigured();

  if (!configured) {
    return NextResponse.json(
      {
        configured: false,
        site: defaultCmsSite(),
        s3EnvMissing: s3EnvMissingParts(),
        s3EnvHint:
          'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, region (AWS_REGION or AWS_DEFAULT_REGION), bucket (AWS_S3_BUCKET_NAME from NailsByNi, or S3_BUCKET_NAME, etc.). Names are case-sensitive on Render.',
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  }

  try {
    const site = await readCmsSiteFromS3();
    return NextResponse.json(
      { configured: true, site: site ?? defaultCmsSite() },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (e) {
    console.error('GET /api/cms/site S3 error:', e);
    return NextResponse.json(
      { error: 'Failed to read site data from storage', configured: true },
      { status: 502 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (!isS3CmsConfigured()) {
    return NextResponse.json({ error: 'S3 CMS is not configured on the server' }, { status: 503 });
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const site = normalizeCmsSite(body);
  try {
    await writeCmsSiteToS3(site);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/cms/site S3 error:', e);
    return NextResponse.json({ error: 'Failed to save site data' }, { status: 502 });
  }
}
