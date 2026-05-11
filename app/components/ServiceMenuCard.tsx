'use client';

import Link from 'next/link';
import type { CmsService } from '@/lib/cmsSiteTypes';
import { formatUsd } from '@/lib/format/currency';

export function ServiceMenuCard({
  service,
  expanded,
  onToggle,
}: {
  service: CmsService;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDescription = Boolean((service.description || '').trim());

  return (
    <div
      role={hasDescription ? 'button' : undefined}
      tabIndex={hasDescription ? 0 : undefined}
      aria-expanded={hasDescription ? expanded : undefined}
      aria-label={
        hasDescription
          ? expanded
            ? `Collapse details for ${service.name}`
            : `Expand full description for ${service.name}`
          : undefined
      }
      onClick={hasDescription ? onToggle : undefined}
      onKeyDown={
        hasDescription
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      className={`relative rounded-xl border border-champagne-300/45 bg-white p-6 text-left shadow-md ring-1 ring-champagne-100/60 transition-all duration-300 ease-out motion-reduce:transition-none ${
        hasDescription ? 'outline-none' : ''
      } ${
        hasDescription
          ? expanded
            ? `z-10 scale-[1.03] cursor-pointer shadow-2xl ring-2 ring-champagne-500/35 motion-reduce:scale-100`
            : `cursor-pointer outline-none hover:z-[1] hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-champagne-500 focus-visible:ring-offset-2`
          : 'hover:z-[1] hover:-translate-y-1 hover:shadow-xl hover:ring-champagne-300/50 motion-reduce:hover:translate-y-0'
      }`}
    >
      <h3 className="mb-2 font-display text-xl font-medium text-lux-espresso">{service.name}</h3>
      {hasDescription ? (
        <p
          className={`mb-4 text-sm leading-relaxed text-lux-espressoLight/90 ${
            expanded ? '' : 'line-clamp-2'
          }`}
        >
          {service.description}
        </p>
      ) : null}
      {!expanded && hasDescription ? (
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-champagne-700/80">
          Tap for full description
        </p>
      ) : null}
      {expanded && hasDescription ? (
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-champagne-700/70">Tap to collapse</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <span className="font-display text-2xl font-medium text-champagne-800">${formatUsd(Number(service.price))}</span>
          {service.duration !== 0 && (
            <p className="mt-1 text-sm text-lux-espressoLight/75">{service.duration || 45} minutes</p>
          )}
        </div>
        <Link
          href={`/booking?service=${encodeURIComponent(service.name)}`}
          className="relative z-20 rounded-xl bg-champagne-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-champagne-700"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}
