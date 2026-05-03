/** Same-origin BroadcastChannel for booking tab → admin tabs (instant notifier without waiting for poll). */
export const ADMIN_BOOKINGS_BROADCAST = 'nails-admin-bookings';

export type AdminBookingBroadcastMessage =
  | { type: 'booking-created'; booking: { id: string; name: string; date: string; timeSlot?: string } }
  | { type: 'poll'; reason?: string };
