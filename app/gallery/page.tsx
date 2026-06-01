import GalleryClient from './GalleryClient';
import { getServerGalleryImages } from '@/lib/cms/gallery-server';

/** Fetch gallery from S3 on each request (admin uploads + env at runtime). */
export const dynamic = 'force-dynamic';

export default async function GalleryPage() {
  const initialImages = await getServerGalleryImages();
  return <GalleryClient initialImages={initialImages} />;
}
