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
import {
  showBrowserNotification,
  warmAdminNotificationServiceWorker,
} from '@/app/lib/adminBrowserNotification';
import { playNewBookingAlertSound } from '@/app/lib/adminNewBookingAlertSound';

const LOG = '[admin-notifications]';

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
 * Never calls `new Notification` unless `Notification.permission === 'granted'`.
 */
export function AdminBookingNotifier() {
  const pathname = usePathname();
  const pollingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log(LOG, 'Notification API not available in this environment');
      return;
    }

    const loginSegment = pathname.includes('/login');
    if (loginSegment) return;

    warmAdminNotificationServiceWorker();

    const bookingsBase = `${adminDashboardBaseFromPathname(pathname)}/bookings`;

    const showNotification = (b: BookingRow) => {
      const perm = Notification.permission;
      console.log(LOG, 'showNotification() booking id=', b.id, 'Notification.permission=', perm);

      if (perm !== 'granted') {
        console.warn(LOG, 'skip notification: permission is not granted (must use Enable alerts / Test first)');
        return;
      }

      const bodyTime = timeLabelForNotify(b);
      const body = `${b.name || 'Guest'}${bodyTime ? ` - ${bodyTime}` : ''}`;
      const dateKey = bookingDateIsoKey(b.date);
      const path = dateKey ? `${bookingsBase}?date=${encodeURIComponent(dateKey)}` : bookingsBase;
      const targetUrl = new URL(path, window.location.origin).href;

      console.log(LOG, 'triggering notification for booking', b.id, body);

      playNewBookingAlertSound();
      void showBrowserNotification({
        title: 'New Booking',
        body,
        tag: `booking-${b.id}`,
        icon: '/icon.png',
        targetUrl,
      }).catch((e) => {
        console.error(LOG, 'showBrowserNotification failed', e);
      });
    };

    const processList = (list: BookingRow[]) => {
      console.log(LOG, 'poll: Notification.permission=', Notification.permission, 'bookings count=', list.length);

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
        console.log(LOG, 'bootstrap: seeded known ids, count=', known.size, '(no notifications on first run)');
        return;
      }

      for (const b of list) {
        if (!known.has(b.id)) {
          console.log(LOG, 'new booking detected id=', b.id, 'name=', b.name);
          known.add(b.id);
          showNotification(b);
        }
      }
      writeKnownIds(known);
    };

    const processSingleBooking = (b: BookingRow) => {
      if (!b?.id) return;
      console.log(LOG, 'BroadcastChannel booking-created id=', b.id, 'permission=', Notification.permission);

      const bootstrapped = sessionStorage.getItem(STORAGE_BOOTSTRAP) === '1';
      if (!bootstrapped) {
        void poll();
        return;
      }
      let known = readKnownIds();
      if (known.has(b.id)) {
        console.log(LOG, 'booking already known, skip duplicate notify');
        return;
      }
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
      if (e.key === 'admin-bookings') {
        console.log(LOG, 'storage event admin-bookings, re-polling');
        void poll();
      }
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
      console.log(LOG, 'BroadcastChannel not available');
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

/**
 * Permission must be requested via user gesture (buttons below).
 * Includes "Test notification" to verify the pipeline.
 */
export function AdminBookingNotificationPermission() {
  const pathname = usePathname();
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPerm('unsupported');
      console.log(LOG, 'permission UI: Notification API unsupported');
      return;
    }
    if (pathname.includes('/login')) return;
    const p = Notification.permission;
    console.log(LOG, 'permission UI: current Notification.permission=', p);
    setPerm(p);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const sync = () => {
      const p = Notification.permission;
      console.log(LOG, 'permission sync (visibility):', p);
      setPerm(p);
    };
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const requestEnable = async () => {
    console.log(LOG, 'Enable alerts clicked; before request:', Notification.permission);
    try {
      const p = await Notification.requestPermission();
      console.log(LOG, 'Enable alerts: requestPermission result=', p);
      if (p === 'denied') {
        console.warn(LOG, 'permission denied by user or browser');
      }
      setPerm(p);
    } catch (e) {
      console.error(LOG, 'requestPermission failed', e);
    }
  };

  const testNotification = async () => {
    setFeedback(null);
    console.log(LOG, 'Test notification clicked; current permission=', Notification.permission);

    if (!('Notification' in window)) {
      console.warn(LOG, 'Test: Notification API missing');
      setFeedback('This browser does not support notifications (or not a secure page — use HTTPS or localhost).');
      return;
    }

    let effective: NotificationPermission = Notification.permission;

    if (effective === 'default') {
      console.log(LOG, 'Test: requesting permission (user gesture)');
      try {
        effective = await Notification.requestPermission();
        console.log(LOG, 'Test: requestPermission result=', effective);
        setPerm(effective);
      } catch (e) {
        console.error(LOG, 'Test: requestPermission error', e);
        setFeedback('Could not request notification permission. Try another browser or check site settings.');
        return;
      }
    }

    if (effective === 'denied') {
      console.warn(LOG, 'Test: permission denied — unblock in browser site settings');
      setFeedback(
        'Notifications are blocked. Use the lock icon → Site settings → allow Notifications, then reload.',
      );
      return;
    }

    if (effective === 'granted') {
      console.log(LOG, 'Test: showing test notification');
      try {
        await showBrowserNotification({
          title: 'Test notification',
          body: 'If you see this, browser alerts are working.',
          icon: '/icon.png',
          tag: `admin-test-notification-${Date.now()}`,
          targetUrl: window.location.href,
        });
        setFeedback(
          'Sent. Desktop: check Notification Center if no banner. Phone: pull down the notification shade; sound follows system Chrome/Android settings.',
        );
      } catch (e) {
        console.error(LOG, 'Test: showBrowserNotification failed', e);
        setFeedback(
          `Could not show notification: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  };

  if (perm === 'unsupported') return null;
  if (pathname.includes('/login')) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[200] flex max-w-lg -translate-x-1/2 flex-col gap-3 rounded-lg border border-champagne-300 bg-white px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-gray-600">
        <span className="font-semibold text-gray-800">Alerts:</span>{' '}
        <span className="capitalize">{perm}</span>
        {perm === 'denied' && (
          <span className="mt-1 block text-amber-800">
            Blocked — allow notifications in the browser lock icon → Site settings, then reload.
          </span>
        )}
        {feedback && (
          <span className="mt-2 block text-xs text-gray-700">{feedback}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {perm === 'default' && (
          <button
            type="button"
            className="rounded-lg bg-champagne-600 px-3 py-2 text-sm font-semibold text-white hover:bg-champagne-700"
            onClick={() => void requestEnable()}
          >
            Enable alerts
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
          onClick={() => void testNotification()}
        >
          Test notification
        </button>
      </div>
    </div>
  );
}
