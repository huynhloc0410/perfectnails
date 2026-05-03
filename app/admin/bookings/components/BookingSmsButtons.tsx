'use client';

import {
  buildConfirmSmsBody,
  buildReminderSmsBody,
  buildSmsHref,
  defaultSmsSiteBaseUrl,
  normalizePhoneForSms,
} from '@/app/lib/adminBookingSms';

type BookingSmsButtonsProps = {
  customerName: string;
  phone: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
};

export function BookingSmsButtons({
  customerName,
  phone,
  service,
  dateLabel,
  timeLabel,
}: BookingSmsButtonsProps) {
  const smsAddr = normalizePhoneForSms(phone);
  const siteBaseUrl = defaultSmsSiteBaseUrl();
  const fields = { customerName, dateLabel, timeLabel, service, siteBaseUrl };
  const confirmBody = buildConfirmSmsBody(fields);
  const reminderBody = buildReminderSmsBody(fields);
  const confirmHref = smsAddr ? buildSmsHref(smsAddr, confirmBody) : null;
  const reminderHref = smsAddr ? buildSmsHref(smsAddr, reminderBody) : null;

  const btn =
    'inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-champagne-400 hover:bg-champagne-50 hover:text-champagne-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-500';

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
      {confirmHref ? (
        <a href={confirmHref} className={`${btn} min-w-[7rem]`}>
          Confirm
        </a>
      ) : (
        <span
          className={`${btn} min-w-[7rem] cursor-not-allowed opacity-50`}
          title="Add a valid phone number on this booking"
        >
          Confirm
        </span>
      )}
      {reminderHref ? (
        <a href={reminderHref} className={`${btn} min-w-[7rem]`}>
          Reminder
        </a>
      ) : (
        <span
          className={`${btn} min-w-[7rem] cursor-not-allowed opacity-50`}
          title="Add a valid phone number on this booking"
        >
          Reminder
        </span>
      )}
    </div>
  );
}
