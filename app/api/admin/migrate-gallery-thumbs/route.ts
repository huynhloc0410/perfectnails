import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { migrateGalleryThumbsBatch } from '@/lib/galleryImages';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '@/lib/s3CmsSite';
import { persistCmsSite } from '@/lib/cms/persistCmsSite';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isS3CmsConfigured()) {
    return NextResponse.json(
      { error: 'S3 CMS is not configured — migration requires production storage.' },
      { status: 503 }
    );
  }

  const batchParam = req.nextUrl.searchParams.get('batch');
  const batch = batchParam ? parseInt(batchParam, 10) : 5;

  try {
    const site = await readCmsSiteFromS3();
    if (!site) {
      return NextResponse.json({ error: 'Could not read site data' }, { status: 502 });
    }

    const result = await migrateGalleryThumbsBatch(site.gallery, batch);
    site.gallery = result.gallery;
    await persistCmsSite(site);

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      remaining: result.remaining,
      errors: result.errors,
      gallery: result.gallery,
    });
  } catch (e) {
    console.error('migrate-gallery-thumbs:', e);
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
  }
}
