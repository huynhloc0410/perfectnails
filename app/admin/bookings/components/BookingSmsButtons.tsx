'use client';

import { useEffect, useState } from 'react';
import {
  buildConfirmSmsBody,
  buildReminderSmsBody,
  buildSmsHref,
  defaultSmsSiteBaseUrl,
  normalizePhoneForSms,
} from '@/app/lib/adminBookingSms';

type BookingSmsButtonsProps = {
  bookingId: string;
  customerName: string;
  phone: string;
  service: string;
  dateLabel: string;
  timeLabel: string;
};

const storageKeyConfirm = (id: string) => `admin-sms-confirm-${id}`;
const storageKeyReminder = (id: string) => `admin-sms-reminder-${id}`;

export function BookingSmsButtons({
  bookingId,
  customerName,
  phone,
  service,
  dateLabel,
  timeLabel,
}: BookingSmsButtonsProps) {
  const [confirmSent, setConfirmSent] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem(storageKeyConfirm(bookingId)) === '1') setConfirmSent(true);
        if (sessionStorage.getItem(storageKeyReminder(bookingId)) === '1') setReminderSent(true);
      }
    } catch {
      /* ignore */
    }
  }, [bookingId]);

  const smsAddr = normalizePhoneForSms(phone);
  const siteBaseUrl = defaultSmsSiteBaseUrl();
  const fields = { customerName, dateLabel, timeLabel, service, siteBaseUrl };
  const confirmBody = buildConfirmSmsBody(fields);
  const reminderBody = buildReminderSmsBody(fields);
  const confirmHref = smsAddr ? buildSmsHref(smsAddr, confirmBody) : null;
  const reminderHref = smsAddr ? buildSmsHref(smsAddr, reminderBody) : null;

  const markConfirm = () => {
    setConfirmSent(true);
    try {
      sessionStorage.setItem(storageKeyConfirm(bookingId), '1');
    } catch {
      /* ignore */
    }
  };

  const markReminder = () => {
    setReminderSent(true);
    try {
      sessionStorage.setItem(storageKeyReminder(bookingId), '1');
    } catch {
      /* ignore */
    }
  };

  const btn =
    'inline-flex min-h-[40px] flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-champagne-400 hover:bg-champagne-50 hover:text-champagne-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-500';

  const btnSent =
    'inline-flex min-h-[40px] flex-1 cursor-default items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-center text-sm font-semibold text-gray-500 min-w-[7rem]';

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
      {confirmSent ? (
        <span className={btnSent} aria-live="polite" aria-label="Confirm message opened">
          Sent
        </span>
      ) : confirmHref ? (
        <a href={confirmHref} className={`${btn} min-w-[7rem]`} onClick={markConfirm}>
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
      {reminderSent ? (
        <span className={btnSent} aria-live="polite" aria-label="Reminder message opened">
          Sent
        </span>
      ) : reminderHref ? (
        <a href={reminderHref} className={`${btn} min-w-[7rem]`} onClick={markReminder}>
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
