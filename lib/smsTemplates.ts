import { SITE_PHONE_DISPLAY } from '@/lib/site/contact';
import {
  SITE_BRAND_NAME,
  SITE_TIMEZONE,
  siteSalonGoogleMapsUrl,
} from '@/lib/site/branding';

const SMS_LOCALE = 'en-US';
const SMS_TZ = { timeZone: SITE_TIMEZONE } as const;

/** e.g. Saturday, May 23 at 2:00 PM (Phoenix) */
export function formatApptTimeForSms(isoDate: string): string {
  const d = new Date(isoDate);
  if (!Number.isFinite(d.getTime())) return isoDate;
  const weekday = d.toLocaleDateString(SMS_LOCALE, { weekday: 'long', ...SMS_TZ });
  const monthDay = d.toLocaleDateString(SMS_LOCALE, { month: 'long', day: 'numeric', ...SMS_TZ });
  const time = d.toLocaleTimeString(SMS_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    ...SMS_TZ,
  });
  return `${weekday}, ${monthDay} at ${time}`;
}

function buildBookingApptSms(params: {
  name: string;
  isoDate: string;
  service: string;
  variant: 'confirmation' | 'reminder';
  hoursBefore?: 24 | 2;
}): string {
  const when = formatApptTimeForSms(params.isoDate);
  const service = params.service.trim() || 'your service';
  const maps = siteSalonGoogleMapsUrl();
  const phone = SITE_PHONE_DISPLAY;

  let lead: string;
  if (params.variant === 'confirmation') {
    lead = `your appointment is booked for ${when}`;
  } else if (params.hoursBefore === 24) {
    lead = `reminder: your appointment is tomorrow, ${when}`;
  } else if (params.hoursBefore === 2) {
    lead = `reminder: your appointment is in about 2 hours, ${when}`;
  } else {
    lead = `reminder: your appointment is ${when}`;
  }

  return `${SITE_BRAND_NAME}: Hi ${params.name}, ${lead} for ${service}. Reply CANCEL to cancel. Call us at ${phone} if you need any other change. Address: ${maps}`;
}

export function bookingConfirmationSms(params: {
  name: string;
  isoDate: string;
  service: string;
}): string {
  return buildBookingApptSms({ ...params, variant: 'confirmation' });
}

export function bookingReminderSms(params: {
  name: string;
  isoDate: string;
  service: string;
  hoursBefore?: 24 | 2;
}): string {
  return buildBookingApptSms({ ...params, variant: 'reminder' });
}
