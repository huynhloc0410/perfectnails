'use client';

import { useEffect, useRef, useState } from 'react';
import type { CustomerVisitDay, CustomerVisitInfo } from '@/lib/cmsSiteTypes';
import { customerVisitHistoryDays } from '@/lib/booking/customerVisitStats';

type CustomerVisitBadgeProps = {
  visit?: CustomerVisitInfo;
};

function VisitDayLine({ day }: { day: CustomerVisitDay }) {
  const names = day.clientNames.length > 0 ? day.clientNames.join(', ') : '—';
  const services = day.services.length > 0 ? day.services.join(', ') : '—';
  return (
    <li className="border-t border-champagne-100 pt-1.5 first:border-t-0 first:pt-0">
      <p className="font-semibold text-neutral-900">{day.date}</p>
      <p className="mt-0.5 text-neutral-700">
        <span className="text-neutral-500">Name:</span> {names}
      </p>
      <p className="mt-0.5 text-neutral-700">
        <span className="text-neutral-500">Service:</span> {services}
      </p>
    </li>
  );
}

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
  const times = visit.visitCount === 1 ? '1 visit' : `${visit.visitCount} visits`;

  if (!visit.isReturning) {
    return (
      <span
        className="ml-1.5 inline-flex align-middle text-sm font-semibold text-sky-700"
        title={`First visit · ${times}`}
      >
        ({label})
      </span>
    );
  }

  const { first, recent } = customerVisitHistoryDays(visit);

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
          className="absolute left-0 top-full z-20 mt-1.5 w-[16.5rem] rounded-lg border border-champagne-200 bg-white px-3 py-2.5 text-xs font-medium leading-snug text-neutral-800 shadow-lg ring-1 ring-black/5"
        >
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-champagne-800">
            First visit · {times}
          </p>
          <ul className="space-y-1.5">
            <VisitDayLine day={first} />
          </ul>
          {recent.length > 0 ? (
            <>
              <p className="mb-1.5 mt-2.5 text-[10px] font-bold uppercase tracking-wide text-champagne-800">
                Last {recent.length} visit{recent.length === 1 ? '' : 's'}
              </p>
              <ul className="space-y-1.5">
                {recent.map((day) => (
                  <VisitDayLine key={day.date} day={day} />
                ))}
              </ul>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
