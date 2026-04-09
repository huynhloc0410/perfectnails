import { MetadataRoute } from 'next';
import { siteAbsoluteUrl } from './lib/siteBranding';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: siteAbsoluteUrl('/sitemap.xml'),
  };
}

