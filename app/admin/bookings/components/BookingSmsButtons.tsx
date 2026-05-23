'use client';

import { useCallback, useEffect, useState } from 'react';

type BookingSmsButtonsProps = {
  bookingId: string;
  customerName: string;
  phone: string;
  service: string;
  /** Booking start instant (ISO) — same as automatic SMS. */
  appointmentIso: string;
};

const storageKeyReminder = (id: string) => `admin-sms-reminder-${id}`;

export function BookingSmsButtons({
  bookingId,
  customerName,
  phone,
  service,
  appointmentIso,
}: BookingSmsButtonsProps) {
  const [reminderSent, setReminderSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem(storageKeyReminder(bookingId)) === '1') setReminderSent(true);
      }
    } catch {
      /* ignore */
    }
  }, [bookingId]);

  const sendReminder = useCallback(async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/admin/booking-sms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customerName,
          phone,
          service,
          isoDate: appointmentIso,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Send failed (${res.status})`);
      }
      setReminderSent(true);
      sessionStorage.setItem(storageKeyReminder(bookingId), '1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  }, [appointmentIso, bookingId, customerName, phone, service]);

  const phoneOk = Boolean(phone?.trim());
  const btn =
    'inline-flex min-h-[40px] items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-center text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-champagne-400 hover:bg-champagne-50 hover:text-champagne-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne-500 disabled:cursor-not-allowed disabled:opacity-50';
  const btnSent =
    'inline-flex min-h-[40px] cursor-default items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-center text-sm font-semibold text-gray-500 min-w-[7rem]';

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      {reminderSent ? (
        <span className={btnSent} aria-live="polite">
          Reminder sent
        </span>
      ) : (
        <button
          type="button"
          className={`${btn} min-w-[7rem]`}
          disabled={!phoneOk || sending}
          title={
            phoneOk
              ? 'Send reminder SMS via Twilio (same as automatic reminders)'
              : 'Add a valid phone number on this booking'
          }
          onClick={() => void sendReminder()}
        >
          {sending ? 'Sending…' : 'Reminder'}
        </button>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
