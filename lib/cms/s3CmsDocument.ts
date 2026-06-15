import type { CmsGalleryImage, CmsSitePayload } from '@/lib/cmsSiteTypes';
import { CMS_SITE_VERSION, defaultCmsSite } from '@/lib/cmsSiteTypes';
import {
  isAdminContentFromPostgres,
  isAdminSiteConfigFromPostgres,
  isBookingsManagedInPostgres,
  isS3GalleryOnlyStorage,
} from '@/lib/db/config';

/** Minimal S3 document when Postgres owns all non-gallery site data. */
export type S3GalleryOnlyDocument = {
  version: number;
  gallery: CmsGalleryImage[];
};

/**
 * Serialize cms/site.json for S3. Omits any field owned by Postgres so stale JSON
 * cannot be merged back into the database.
 */
export function toS3CmsDocument(site: CmsSitePayload): Record<string, unknown> {
  if (isS3GalleryOnlyStorage()) {
    return {
      version: site.version ?? CMS_SITE_VERSION,
      gallery: site.gallery,
    };
  }

  const doc: Record<string, unknown> = {
    version: site.version ?? CMS_SITE_VERSION,
    gallery: site.gallery,
  };

  if (!isAdminSiteConfigFromPostgres()) {
    doc.services = site.services;
    doc.employees = site.employees;
    doc.bookingBlocks = site.bookingBlocks;
  }
  if (!isBookingsManagedInPostgres()) {
    doc.bookings = site.bookings;
    doc.smsJobs = site.smsJobs;
  }
  if (!isAdminContentFromPostgres()) {
    doc.about = site.about;
    doc.contact = site.contact;
  }

  return doc;
}

/** Strip Postgres-owned fields after parsing S3 (in-memory app shape keeps defaults). */
export function applyPostgresOwnedFieldDefaults(site: CmsSitePayload): CmsSitePayload {
  const defaults = defaultCmsSite();
  return {
    version: site.version,
    gallery: site.gallery,
    bookings: isBookingsManagedInPostgres() ? [] : site.bookings,
    smsJobs: [],
    services: isAdminSiteConfigFromPostgres() ? defaults.services : site.services,
    employees: isAdminSiteConfigFromPostgres() ? defaults.employees : site.employees,
    bookingBlocks: isAdminSiteConfigFromPostgres() ? defaults.bookingBlocks : site.bookingBlocks,
    about: isAdminContentFromPostgres() ? defaults.about : site.about,
    contact: isAdminContentFromPostgres() ? defaults.contact : site.contact,
  };
}

/** GET /api/cms/site response — same fields as stored in S3. */
export function toCmsSiteApiPayload(site: CmsSitePayload): Record<string, unknown> {
  return toS3CmsDocument(site);
}
