/** Postgres booking_status values exposed to the app. */
export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/** Bookings that still hold a time slot on the public calendar. */
export function isSchedulingActiveStatus(status: string | undefined | null): boolean {
  const s = String(status ?? 'confirmed').trim().toLowerCase();
  return s === 'pending' || s === 'confirmed';
}

export function normalizeBookingStatus(raw: unknown): BookingStatus {
  const s = String(raw ?? 'confirmed').trim().toLowerCase();
  if (s === 'pending') return 'pending';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'no_show') return 'no_show';
  return 'confirmed';
}

export function bookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Completed';
    case 'no_show':
      return 'No-show';
    default:
      return 'Confirmed';
  }
}
