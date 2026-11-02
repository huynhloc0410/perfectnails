import GalleryClient from './GalleryClient';
import { getPublicPageSnapshot } from '@/lib/site/publicPageCache';

/** Images still load from their own URLs. The list of photos is prepared on the server. */
export default async function GalleryPage() {
  const { gallery } = await getPublicPageSnapshot();
  return <GalleryClient images={gallery} />;
}
