import { SITE_BRAND_NAME } from '@/app/lib/siteBranding';

export function formatApptTimeForSms(isoDate: string): string {
  const d = new Date(isoDate);
  if (!Number.isFinite(d.getTime())) return isoDate;
  const date = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

