import { Suspense } from 'react';
import { BookingsCalendarClient } from './BookingsCalendarClient';

function BookingsFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading calendar…</p>
    </div>
  );
}

export default function AdminBookingsPage() {
  return (
    <Suspense fallback={<BookingsFallback />}>
      <BookingsCalendarClient />
    </Suspense>
  );
}
