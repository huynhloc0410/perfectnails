import { NextResponse } from 'next/server';
import { CACHE_HEADERS_PRIVATE_NO_STORE } from '@/lib/http/cache-headers';
import { isPublicContentFromPostgres } from '@/lib/db/config';
import { loadPublicSiteContentFromPostgres } from '@/lib/db/publicSiteContent';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '@/lib/s3CmsSite';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (isPublicContentFromPostgres()) {
    try {
      const content = await loadPublicSiteContentFromPostgres();
      return NextResponse.json(
        {
          configured: true,
          source: 'postgres',
          site: content,
        },
        { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
      );
    } catch (e) {
      console.error('GET /api/public/site-data postgres failed, trying S3:', e);
    }
  }

  if (!isS3CmsConfigured()) {
    return NextResponse.json(
      { configured: false, source: 'cms', reason: 'No content source configured' },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  }

  try {
    const site = await readCmsSiteFromS3();
    if (!site) {
      return NextResponse.json(
        { configured: false, source: 's3' },
        { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
      );
    }
    return NextResponse.json(
      {
        configured: true,
        source: 's3',
        site: {
          services: site.services,
          about: site.about,
          contact: site.contact,
        },
      },
      { headers: CACHE_HEADERS_PRIVATE_NO_STORE }
    );
  } catch (e) {
    console.error('GET /api/public/site-data S3 error:', e);
    return NextResponse.json({ error: 'Failed to load site content' }, { status: 502 });
  }
}
