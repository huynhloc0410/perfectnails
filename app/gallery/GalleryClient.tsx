'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import GalleryLightbox from '../components/GalleryLightbox';
import InnerPageHero from '../components/InnerPageHero';
import { fetchCmsSite } from '@/lib/cms/site-client';
import {
  GALLERY_PAGE_SIZE,
  GALLERY_THUMB_SIZES,
  resolveGalleryImageSrc,
  sortGalleryNewestFirst,
} from '@/lib/gallery';

type Props = {
  initialImages: string[];
};

export default function GalleryClient({ initialImages }: Props) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [visibleCount, setVisibleCount] = useState(GALLERY_PAGE_SIZE);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const visibleImages = useMemo(
    () => images.slice(0, visibleCount),
    [images, visibleCount]
  );
  const hasMore = images.length > visibleCount;

  useEffect(() => {
    if (initialImages.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (
          data.configured &&
          data.site &&
          Array.isArray(data.site.gallery) &&
          data.site.gallery.length > 0 &&
          !data.error
        ) {
          setImages(sortGalleryNewestFirst(data.site.gallery as string[]));
          return;
        }
      } catch {
        /* fallback */
      }
      if (cancelled) return;
      const savedGallery = localStorage.getItem('admin-gallery');
      if (savedGallery) {
        try {
          const parsed = JSON.parse(savedGallery) as string[];
          if (Array.isArray(parsed)) setImages(sortGalleryNewestFirst(parsed));
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialImages.length]);

  return (
    <div>
      <InnerPageHero
        breadcrumbLabel="Gallery"
        title="Gallery"
        subtitle="Tap a photo to enlarge it. Swipe left or right, or use the arrows, to browse."
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-champagne-400/40 bg-white/70 py-12 text-center ring-1 ring-champagne-100/50">
            <p className="text-lg text-lux-espressoLight">No images in the gallery yet.</p>
            <p className="mt-2 text-sm text-lux-espressoLight/80">Check back soon for our latest work!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visibleImages.map((url, index) => {
                const src = resolveGalleryImageSrc(url);
                const priority = index < 4;
                return (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="group relative block w-full rounded-xl border border-champagne-400/35 bg-gradient-to-b from-white to-stone-50/60 p-2 text-left shadow-sm ring-1 ring-champagne-200/40 transition hover:-translate-y-0.5 hover:border-champagne-500/50 hover:shadow-md hover:ring-champagne-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-600 focus-visible:ring-offset-2"
                  >
                    <span className="sr-only">Open image {index + 1} in viewer</span>
                    <div className="relative overflow-hidden rounded-lg bg-stone-100 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                      <div className="relative aspect-[4/5] w-full">
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes={GALLERY_THUMB_SIZES}
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                          loading={priority ? 'eager' : 'lazy'}
                          priority={priority}
                          quality={75}
                        />
                      </div>
                      <div
                        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/15 via-transparent to-white/10 opacity-70 transition group-hover:opacity-90"
                        aria-hidden
                      />
                    </div>
                    <span
                      className="pointer-events-none absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-champagne-500/40 bg-neutral-950/60 text-champagne-200 shadow-md backdrop-blur-sm opacity-90 transition group-hover:bg-neutral-950/80"
                      aria-hidden
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + GALLERY_PAGE_SIZE)}
                  className="rounded-md border border-champagne-500/50 bg-white px-6 py-2.5 text-sm font-semibold text-lux-espresso shadow-sm transition hover:border-champagne-600/60 hover:bg-champagne-50/80"
                >
                  Load more ({images.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <GalleryLightbox
        images={images}
        resolveSrc={resolveGalleryImageSrc}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
