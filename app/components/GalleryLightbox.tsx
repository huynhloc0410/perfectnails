'use client';

import { useCallback, useEffect, useState } from 'react';

const ZOOM_LEVELS = [1, 1.5, 2.25] as const;

type Props = {
  images: string[];
  resolveSrc: (url: string) => string;
  openIndex: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export default function GalleryLightbox({
  images,
  resolveSrc,
  openIndex,
  onClose,
  onIndexChange,
}: Props) {
  const [zoomStep, setZoomStep] = useState(0);

  const open = openIndex !== null && images.length > 0;
  const index = openIndex ?? 0;
  const zoom = ZOOM_LEVELS[zoomStep] ?? 1;
  const src = open ? resolveSrc(images[index] || '') : '';
  const canNav = images.length > 1;

  useEffect(() => {
    setZoomStep(0);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    if (!canNav) return;
    onIndexChange((index - 1 + images.length) % images.length);
  }, [canNav, images.length, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (!canNav) return;
    onIndexChange((index + 1) % images.length);
  }, [canNav, images.length, index, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, goPrev, goNext]);

  const zoomIn = () => setZoomStep((s) => Math.min(s + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomStep((s) => Math.max(s - 1, 0));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery image viewer"
    >
      <button
        type="button"
        className="absolute inset-0 bg-neutral-950/88 backdrop-blur-sm"
        aria-label="Close gallery"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
          <p className="truncate text-sm text-champagne-200/90">
            {index + 1} / {images.length}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="hidden text-xs text-champagne-300/80 sm:inline">Zoom</span>
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoomStep <= 0}
              className="rounded-md border border-champagne-600/50 bg-neutral-900/80 px-2 py-1 text-sm font-medium text-champagne-100 transition hover:bg-neutral-800 disabled:opacity-35"
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-[2.75rem] text-center text-xs tabular-nums text-champagne-200">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoomStep >= ZOOM_LEVELS.length - 1}
              className="rounded-md border border-champagne-600/50 bg-neutral-900/80 px-2 py-1 text-sm font-medium text-champagne-100 transition hover:bg-neutral-800 disabled:opacity-35"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-md border border-champagne-600/40 bg-neutral-900/90 px-3 py-1.5 text-sm font-semibold text-champagne-100 transition hover:bg-champagne-900/50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-champagne-600/35 bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.4)]">
          <div className="h-[min(75vh,680px)] w-full overflow-auto overscroll-contain">
            <div
              className="flex min-h-full min-w-full items-center justify-center p-4"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              <img
                src={src}
                alt={`Gallery image ${index + 1} — enlarged view`}
                className="max-h-[min(75vh,680px)] max-w-full object-contain select-none motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
                draggable={false}
              />
            </div>
          </div>

          {canNav && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-champagne-500/45 bg-neutral-950/75 text-champagne-200 shadow-md backdrop-blur-sm transition hover:border-champagne-400/60 hover:bg-neutral-900/90 hover:text-champagne-50"
                aria-label="Previous image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-champagne-500/45 bg-neutral-950/75 text-champagne-200 shadow-md backdrop-blur-sm transition hover:border-champagne-400/60 hover:bg-neutral-900/90 hover:text-champagne-50"
                aria-label="Next image"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
