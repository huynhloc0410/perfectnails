'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import GalleryLightbox from '../components/GalleryLightbox';
import PageHeroRule from '../components/PageHeroRule';
import { fetchCmsSite } from '../lib/cmsSiteClient';

function resolveImageSrc(url: string): string {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (typeof window !== 'undefined' && u.startsWith('/')) {
    return `${window.location.origin}${u}`;
  }
  return u;
}

export default function Gallery() {
  const [images, setImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
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
          setImages(data.site.gallery as string[]);
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
          if (Array.isArray(parsed)) setImages(parsed);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <section className="relative border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-stone-100 to-champagne-100 py-[0.525rem] overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-champagne-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-champagne-200/50 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'Gallery' }]} />
          <div className="text-center mb-[0.175rem] mt-[0.175rem]">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">Gallery</h2>
            <PageHeroRule />
            <p className="text-sm text-gray-600 max-w-2xl mx-auto mt-[0.525rem]">
              Tap a photo to enlarge it. Swipe left or right, or use the arrows, to browse.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10 border-t border-champagne-300/25">
        {images.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-champagne-400/35 bg-white/60">
            <p className="text-gray-600 text-lg">No images in the gallery yet.</p>
            <p className="text-gray-500 text-sm mt-2">Check back soon for our latest work!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => {
              const src = resolveImageSrc(url);
              return (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group relative block w-full overflow-hidden rounded-lg border border-champagne-400/30 bg-white text-left shadow-sm ring-1 ring-champagne-200/40 transition hover:border-champagne-500/45 hover:ring-champagne-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-600 focus-visible:ring-offset-2"
                >
                  <span className="sr-only">Open image {index + 1} in viewer</span>
                  <img
                    src={src}
                    alt=""
                    className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100 bg-stone-100"
                    loading="lazy"
                  />
                  <span
                    className="pointer-events-none absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-champagne-500/40 bg-neutral-950/55 text-champagne-200 shadow-md backdrop-blur-sm opacity-90 transition group-hover:bg-neutral-950/75"
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
        )}
      </div>

      <GalleryLightbox
        images={images}
        resolveSrc={resolveImageSrc}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
