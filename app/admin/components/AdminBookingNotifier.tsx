'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminDashboardBaseFromPathname } from '@/app/lib/adminPublicPath';
import {
  ADMIN_BOOKINGS_BROADCAST,
  type AdminBookingBroadcastMessage,
} from '@/app/lib/adminBookingBroadcast';
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
const POLL_MS = 15_000;

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

/** Merge S3/CMS snapshot with local `admin-bookings` so dev + hybrid setups see every booking. */
async function fetchBookingsList(): Promise<BookingRow[]> {
  const byId = new Map<string, BookingRow>();

  try {
    const r = await fetch('/api/cms/site', { credentials: 'same-origin', cache: 'no-store' });
    const data = await r.json();
    if (data.site && Array.isArray(data.site.bookings)) {
      for (const b of data.site.bookings as BookingRow[]) {
        if (b?.id) byId.set(b.id, b);
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const raw = localStorage.getItem('admin-bookings');
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const b of parsed as BookingRow[]) {
          if (b?.id) byId.set(b.id, b);
        }
      }
    }
  } catch {
    /* ignore */
  }

  return Array.from(byId.values());
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

    const bookingsBase = `${adminDashboardBaseFromPathname(pathname)}/bookings`;

    const showNotification = (b: BookingRow) => {
      if (Notification.permission !== 'granted') {
        return;
      }

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
          const url = dateKey ? `${bookingsBase}?date=${encodeURIComponent(dateKey)}` : bookingsBase;
          window.location.href = url;
        };
      } catch {
        /* ignore */
      }
    };

    const processList = (list: BookingRow[]) => {
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
    };

    const processSingleBooking = (b: BookingRow) => {
      if (!b?.id) return;
      const bootstrapped = sessionStorage.getItem(STORAGE_BOOTSTRAP) === '1';
      if (!bootstrapped) {
        void poll();
        return;
      }
      let known = readKnownIds();
      if (known.has(b.id)) return;
      known.add(b.id);
      writeKnownIds(known);
      showNotification(b);
    };

    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const list = await fetchBookingsList();
        processList(list);
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

    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(ADMIN_BOOKINGS_BROADCAST);
      bc.onmessage = (ev: MessageEvent<AdminBookingBroadcastMessage>) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'booking-created' && msg.booking) {
          processSingleBooking(msg.booking as BookingRow);
        }
        if (msg.type === 'poll') void poll();
      };
    } catch {
      /* BroadcastChannel unsupported */
    }

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      try {
        bc?.close();
      } catch {
        /* ignore */
      }
    };
  }, [pathname]);

  return null;
}

/** Prompt for permission + hint when blocked. */
export function AdminBookingNotificationPermission() {
  const pathname = usePathname();
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPerm('unsupported');
      return;
    }
    if (pathname.includes('/login')) return;
    setPerm(Notification.permission);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const sync = () => setPerm(Notification.permission);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  if (perm === 'unsupported') return null;
  if (pathname.includes('/login')) return null;
  if (perm === 'granted') return null;

  if (perm === 'denied') {
    return (
      <div className="fixed bottom-4 left-1/2 z-[200] max-w-md -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
        <p className="font-medium">Booking alerts are blocked</p>
        <p className="mt-1 text-amber-900/90">
          Allow notifications for this site in your browser (lock icon or site settings), then reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex max-w-md -translate-x-1/2 flex-col gap-2 rounded-lg border border-champagne-300 bg-white px-4 py-3 shadow-lg sm:flex-row sm:items-center">
      <p className="text-sm text-gray-800">Turn on desktop alerts for new online bookings.</p>
      <button
        type="button"
        className="shrink-0 rounded-lg bg-champagne-600 px-3 py-2 text-sm font-semibold text-white hover:bg-champagne-700"
        onClick={async () => {
          const p = await Notification.requestPermission();
          setPerm(p);
        }}
      >
        Enable alerts
      </button>
    </div>
  );
}
