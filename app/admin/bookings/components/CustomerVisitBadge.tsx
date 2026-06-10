'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerVisitInfo } from '@/lib/cmsSiteTypes';
import { customerVisitHistoryLabel } from '@/lib/booking/customerVisitStats';

type CustomerVisitBadgeProps = {
  visit?: CustomerVisitInfo;
};

export function CustomerVisitBadge({ visit }: CustomerVisitBadgeProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!visit) return null;

  const label = visit.isReturning ? 'Old' : 'New';
  const history = customerVisitHistoryLabel(visit);

  if (!visit.isReturning) {
    return (
      <span
        className="ml-1.5 inline-flex align-middle text-sm font-semibold text-sky-700"
        title={history}
      >
        ({label})
      </span>
    );
  }

  return (
    <span ref={wrapRef} className="relative ml-1.5 inline-flex align-middle">
      <button
        type="button"
        className="text-sm font-semibold text-champagne-800 underline decoration-champagne-400/80 underline-offset-2 hover:text-champagne-950"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        ({label})
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 min-w-[12rem] rounded-lg border border-champagne-200 bg-white px-3 py-2 text-xs font-medium leading-snug text-neutral-800 shadow-lg ring-1 ring-black/5"
        >
          {history}
        </span>
      ) : null}
    </span>
  );
}
