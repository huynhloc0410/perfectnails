import GalleryClient from './GalleryClient';

/** Client fetches CMS; images load directly from S3 (not via Render image optimizer). */
export default function GalleryPage() {
  return <GalleryClient />;
}
