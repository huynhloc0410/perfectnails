import {
  SITE_BRAND_NAME,
  SITE_PUBLIC_URL,
  SITE_SALON_ADDRESS_LINE,
  siteSalonAppleMapsUrl,
  siteSalonGoogleMapsUrl,
} from '@/app/lib/siteBranding';

/** E.164-style address for `sms:` links (digits with leading + when possible). */
export function normalizePhoneForSms(raw: string): string {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * `sms:{phone}?body={encoded}` — opens the device SMS app; does not send automatically.
 */
export function buildSmsHref(phoneSmsAddress: string, messageBody: string): string {
  const body = encodeURIComponent(messageBody);
  return `sms:${phoneSmsAddress}?body=${body}`;
}

export type BookingSmsCopyFields = {
  customerName: string;
  dateLabel: string;
  timeLabel: string;
  service: string;
  /** Public site base URL (no trailing slash), e.g. https://example.com */
  siteBaseUrl: string;
};

export function buildConfirmSmsBody(f: BookingSmsCopyFields): string {
  const bookingLink = `${f.siteBaseUrl}/booking`;
  const googleMaps = siteSalonGoogleMapsUrl();
  const appleMaps = siteSalonAppleMapsUrl();
  return [
    `Hi ${f.customerName},`,
    '',
    `Your appointment at ${SITE_BRAND_NAME} is confirmed for ${f.dateLabel} at ${f.timeLabel} — ${f.service}.`,
    '',
    `We're here (save this address):`,
    `${SITE_BRAND_NAME}`,
    SITE_SALON_ADDRESS_LINE,
    '',
    `Directions — Google Maps: ${googleMaps}`,
    `Directions — Apple Maps: ${appleMaps}`,
    '',
    `Book again: ${bookingLink}`,
  ].join('\n');
}

export function buildReminderSmsBody(f: BookingSmsCopyFields): string {
  const bookingLink = `${f.siteBaseUrl}/booking`;
  const googleMaps = siteSalonGoogleMapsUrl();
  const appleMaps = siteSalonAppleMapsUrl();
  return [
    `Hi ${f.customerName},`,
    '',
    `Reminder: ${f.dateLabel} at ${f.timeLabel} — ${f.service} at ${SITE_BRAND_NAME}.`,
    '',
    `Visit us:`,
    SITE_SALON_ADDRESS_LINE,
    '',
    `Google Maps: ${googleMaps}`,
    `Apple Maps: ${appleMaps}`,
    '',
    bookingLink,
  ].join('\n');
}

/** Canonical public URL for SMS when admin UI runs on another host (e.g. Vercel preview). */
export function defaultSmsSiteBaseUrl(): string {
  return SITE_PUBLIC_URL.replace(/\/$/, '');
}
