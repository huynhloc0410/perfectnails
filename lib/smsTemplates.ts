import { SITE_BRAND_NAME, SITE_TIMEZONE } from '@/lib/site/branding';

const SMS_LOCALE = 'en-US';
const SMS_TZ = { timeZone: SITE_TIMEZONE } as const;

export function formatApptTimeForSms(isoDate: string): string {
  const d = new Date(isoDate);
  if (!Number.isFinite(d.getTime())) return isoDate;
  const date = d.toLocaleDateString(SMS_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    ...SMS_TZ,
  });
  const time = d.toLocaleTimeString(SMS_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    ...SMS_TZ,
  });
  return `${date} at ${time}`;
}

export function bookingConfirmationSms(params: { name: string; isoDate: string }): string {
  const when = formatApptTimeForSms(params.isoDate);
  return `Hi ${params.name}, your appointment at ${SITE_BRAND_NAME} is confirmed for ${when}. We look forward to seeing you!`;
}

export function bookingReminderSms(params: { name: string; isoDate: string }): string {
  const when = formatApptTimeForSms(params.isoDate);
  return `Hi ${params.name}, just a reminder of your appointment at ${SITE_BRAND_NAME} for ${when}. See you soon!`;
}

