'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminDashboardBaseFromPathname } from '@/app/lib/adminPublicPath';
import {
  formatMinutesAsTimeLabel,
  getBookingStartMinutes,
} from '@/app/lib/bookingTimeUtils';

type BookingRow = {
  id: string;
  name: string;
  date: string;
  timeSlot?: string;
};

const STORAGE_KNOWN_IDS = 'admin-known-booking-ids';
const STORAGE_BOOTSTRAP = 'admin-bookings-notifier-bootstrapped';
const POLL_MS = 45_000;

function bookingDateIsoKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeLabelForNotify(b: BookingRow): string {
  const mins = getBookingStartMinutes(b);
  return formatMinutesAsTimeLabel(mins);
}

async function fetchBookingsList(): Promise<BookingRow[]> {
  try {
    const r = await fetch('/api/cms/site', { credentials: 'same-origin' });
    const data = await r.json();
    if (data.configured === true && data.site && Array.isArray(data.site.bookings)) {
      return data.site.bookings as BookingRow[];
    }
  } catch {
    /* fall through */
  }
  try {
    const raw = localStorage.getItem('admin-bookings');
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return parsed as BookingRow[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function readKnownIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KNOWN_IDS);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function writeKnownIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(STORAGE_KNOWN_IDS, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

/**
 * Polls for new bookings and shows browser notifications; click navigates to /admin/.../bookings?date=...
 */
export function AdminBookingNotifier() {
  const pathname = usePathname();
  const pollingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const loginSegment = pathname.includes('/login');
    if (loginSegment) return;

    const base = adminDashboardBaseFromPathname(pathname);
    const bookingsBase = `${base}/bookings`;

    const showNotification = (b: BookingRow) => {
      if (Notification.permission !== 'granted') return;

      const bodyTime = timeLabelForNotify(b);
      const body = `${b.name || 'Guest'}${bodyTime ? ` - ${bodyTime}` : ''}`;

      try {
        const n = new Notification('New Booking', {
          body,
          icon: '/icon.png',
          tag: `booking-${b.id}`,
          requireInteraction: false,
        });

        n.onclick = () => {
          n.close();
          try {
            window.focus();
          } catch {
            /* ignore */
          }
          const dateKey = bookingDateIsoKey(b.date);
          const url = dateKey
            ? `${bookingsBase}?date=${encodeURIComponent(dateKey)}`
            : bookingsBase;
          window.location.href = url;
        };
      } catch {
        /* ignore */
      }
    };

    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const list = await fetchBookingsList();
        let known = readKnownIds();
        const bootstrapped = sessionStorage.getItem(STORAGE_BOOTSTRAP) === '1';

        if (!bootstrapped) {
          try {
            sessionStorage.setItem(STORAGE_BOOTSTRAP, '1');
          } catch {
            /* ignore */
          }
          known = new Set(list.map((x) => x.id));
          writeKnownIds(known);
          return;
        }

        for (const b of list) {
          if (!known.has(b.id)) {
            known.add(b.id);
            showNotification(b);
          }
        }
        writeKnownIds(known);
      } finally {
        pollingRef.current = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin-bookings') void poll();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [pathname]);

  return null;
}

/** Prompt once when permission is still "default" (requires click for requestPermission). */
export function AdminBookingNotificationPermission() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (pathname.includes('/login')) return;
    setVisible(Notification.permission === 'default');
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex max-w-md -translate-x-1/2 flex-col gap-2 rounded-lg border border-champagne-300 bg-white px-4 py-3 shadow-lg sm:flex-row sm:items-center">
      <p className="text-sm text-gray-800">Get desktop alerts when customers book online.</p>
      <button
        type="button"
        className="shrink-0 rounded-lg bg-champagne-600 px-3 py-2 text-sm font-semibold text-white hover:bg-champagne-700"
        onClick={async () => {
          const p = await Notification.requestPermission();
          setVisible(p === 'default');
        }}
      >
        Enable alerts
      </button>
    </div>
  );
}
