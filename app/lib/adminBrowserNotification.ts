/**
 * Desktop browsers allow `new Notification()`. Android Chrome (and some others) require
 * ServiceWorkerRegistration.showNotification() — the Notification constructor throws
 * "Illegal constructor" on those platforms.
 */

const LOG = '[admin-notifications]';
const SW_PATH = '/admin-notifications-sw.js';

let swRegisterPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export function warmAdminNotificationServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  void getAdminNotificationServiceWorker();
}

function getAdminNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!swRegisterPromise) {
    swRegisterPromise = navigator.serviceWorker
      .register(SW_PATH, { scope: '/' })
      .then((reg) => {
        console.log(LOG, 'service worker registered', reg.scope);
        return reg;
      })
      .catch((e) => {
        console.warn(LOG, 'service worker register failed', e);
        swRegisterPromise = null;
        return null;
      });
  }
  return swRegisterPromise;
}

export type ShowBrowserNotificationArgs = {
  title: string;
  body: string;
  tag: string;
  icon?: string;
  /** Absolute same-origin URL opened when the user taps the notification (SW path). */
  targetUrl: string;
};

function vibratePattern(): number[] | undefined {
  if (typeof navigator === 'undefined') return undefined;
  if (/Android/i.test(navigator.userAgent)) return [200, 100, 200];
  return undefined;
}

/**
 * Shows a local notification. Uses `new Notification` when allowed; otherwise registers
 * the admin SW and uses registration.showNotification (required on Android Chrome).
 * Sound: controlled by the OS / browser (`silent: false`); custom alert sounds are not
 * portable on the web notification API.
 */
export async function showBrowserNotification(args: ShowBrowserNotificationArgs): Promise<void> {
  const { title, body, tag, icon = '/icon.png', targetUrl } = args;

  if (typeof window === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const vibrate = vibratePattern();
  const base: NotificationOptions = {
    body,
    icon,
    tag,
    silent: false,
    data: { url: targetUrl },
  };
  if (vibrate) {
    Object.assign(base, { vibrate });
  }

  try {
    const n = new Notification(title, base);
    n.onclick = () => {
      n.close();
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      window.location.href = targetUrl;
    };
    return;
  } catch (e) {
    console.log(LOG, 'new Notification() failed, using service worker', e);
  }

  const reg = await getAdminNotificationServiceWorker();
  if (!reg) {
    throw new Error('Service worker unavailable for notifications');
  }
  await reg.update().catch(() => {
    /* ignore */
  });
  await reg.showNotification(title, {
    ...base,
    renotify: true,
  });
}
