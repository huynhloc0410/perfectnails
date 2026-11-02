import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { cache } from 'react';
import type { CmsAbout, CmsContact, CmsGalleryImage, CmsService } from '@/lib/cmsSiteTypes';
import { normalizeCmsGalleryList } from '@/lib/cmsSiteTypes';
import { isPublicContentFromPostgres } from '@/lib/db/config';
import { loadPublicSiteContentFromPostgres } from '@/lib/db/publicSiteContent';
import { sortGalleryNewestFirst } from '@/lib/gallery';
import { isS3CmsConfigured, readCmsSiteFromS3 } from '@/lib/s3CmsSite';
import { normalizeContactSocialMedia } from '@/lib/site/contact';

/** How long a prepared public page may be reused before the server asks the database and S3 again. */
export const PUBLIC_PAGE_REVALIDATE_SECONDS = 60;

const PUBLIC_PAGE_CACHE_TAG = 'public-pages';

export type PublicPageContent = {
  services: CmsService[];
  about: CmsAbout;
  contact: CmsContact;
};

export type PublicPageSnapshot = PublicPageContent & {
  gallery: CmsGalleryImage[];
};

const EMPTY_ABOUT: CmsAbout = { title: 'About Us', content: '' };

const EMPTY_CONTACT: CmsContact = {
  address: '',
  phone: '',
  email: '',
  hours: '',
  socialMedia: { facebook: '', instagram: '', yelp: '' },
};

function emptyContent(): PublicPageContent {
  return {
    services: [],
    about: EMPTY_ABOUT,
    contact: EMPTY_CONTACT,
  };
}

function withNormalizedContact(content: PublicPageContent): PublicPageContent {
  return {
    ...content,
    contact: {
      ...content.contact,
      address: content.contact.address?.trim() ?? '',
      phone: content.contact.phone?.trim() ?? '',
      email: content.contact.email?.trim() ?? '',
      hours: content.contact.hours?.trim() ?? '',
      socialMedia: normalizeContactSocialMedia(content.contact.socialMedia),
    },
  };
}

function contentFromCmsSite(site: {
  services?: CmsService[];
  about?: CmsAbout;
  contact?: CmsContact;
}): PublicPageContent {
  return withNormalizedContact({
    services: Array.isArray(site.services) ? site.services : [],
    about: site.about ?? EMPTY_ABOUT,
    contact: site.contact ?? EMPTY_CONTACT,
  });
}

async function loadPublicContent(): Promise<PublicPageContent> {
  if (isPublicContentFromPostgres()) {
    return withNormalizedContact(await loadPublicSiteContentFromPostgres());
  }

  if (!isS3CmsConfigured()) return emptyContent();

  const site = await readCmsSiteFromS3();
  if (!site) return emptyContent();
  return contentFromCmsSite(site);
}

async function loadPublicGallery(): Promise<CmsGalleryImage[]> {
  if (!isS3CmsConfigured()) return [];
  const site = await readCmsSiteFromS3();
  return sortGalleryNewestFirst(normalizeCmsGalleryList(site?.gallery));
}

const readCachedPublicContent = unstable_cache(loadPublicContent, ['public-pages-content-v1'], {
  revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  tags: [PUBLIC_PAGE_CACHE_TAG],
});

const readCachedPublicGallery = unstable_cache(loadPublicGallery, ['public-pages-gallery-v1'], {
  revalidate: PUBLIC_PAGE_REVALIDATE_SECONDS,
  tags: [PUBLIC_PAGE_CACHE_TAG],
});

/** Services, about, contact, and gallery for public pages. Booking slots are not included. */
export const getPublicPageSnapshot = cache(async (): Promise<PublicPageSnapshot> => {
  const [content, gallery] = await Promise.all([
    readCachedPublicContent().catch((error: unknown) => {
      console.error('Public page content cache miss failed:', error);
      return emptyContent();
    }),
    readCachedPublicGallery().catch((error: unknown) => {
      console.error('Public gallery cache miss failed:', error);
      return [] as CmsGalleryImage[];
    }),
  ]);

  return { ...content, gallery };
});

/** Drop the 60s copy after an admin save so the next visit sees the new menu, contact, or gallery. */
export function revalidatePublicPages(): void {
  try {
    revalidateTag(PUBLIC_PAGE_CACHE_TAG);
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('Failed to refresh public page cache:', error);
  }
}
