'use client';

import {
  adminBookingCardClasses,
  adminBookingDetailTextClasses,
  adminBookingKindBadgeClasses,
  adminBookingKindLabel,
  adminBookingServiceTextClasses,
  getBookingServiceKind,
  type BookingServiceKind,
} from '@/lib/booking/booking-service-kind';
import { BookingSmsButtons } from './BookingSmsButtons';

type Employee = {
  id: string;
  name: string;
  role: string;
};

type ServiceCatalogRow = {
  name?: string | null;
  category?: string | null;
};

type BookingDetailCardProps = {
  booking: {
    id: string;
    name: string;
    phone: string;
    service: string;
    employee?: string;
    date: string;
    duration: number;
    notes?: string;
  };
  bookingEmployee: Employee | null;
  serviceCatalog: ServiceCatalogRow[] | null;
  onDelete: (id: string) => void;
};

export function BookingDetailCard({
  booking,
  bookingEmployee,
  serviceCatalog,
  onDelete,
}: BookingDetailCardProps) {
  const kind: BookingServiceKind = getBookingServiceKind(booking.service, serviceCatalog);

  const detailText = adminBookingDetailTextClasses();

  return (
    <li
      className={`w-full min-w-[14rem] max-w-md flex-1 basis-56 rounded-lg p-4 transition ${adminBookingCardClasses(kind)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${adminBookingKindBadgeClasses(kind)}`}
        >
          {adminBookingKindLabel(kind)}
        </span>
        <button
          type="button"
          onClick={() => onDelete(booking.id)}
          className="shrink-0 rounded-md bg-neutral-900/85 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-950"
        >
          Delete
        </button>
      </div>
      <p className="mt-3 text-base font-bold leading-snug text-neutral-950">{booking.name}</p>
      <p className={`mt-2 ${detailText}`}>Phone: {booking.phone}</p>
      <p className={`mt-1 ${adminBookingServiceTextClasses(kind)}`}>{booking.service}</p>
      {bookingEmployee && (
        <p className={`mt-1 ${detailText}`}>
          Staff: <span className="font-semibold">{bookingEmployee.name}</span> ({bookingEmployee.role})
        </p>
      )}
      <p className={`mt-2 ${detailText}`}>Duration: {booking.duration || 45} min</p>
      {booking.notes?.trim() ? (
        <p className={`mt-2 rounded-md border border-neutral-900/10 bg-white/80 px-2.5 py-2 text-sm leading-relaxed ${detailText}`}>
          <span className="font-semibold text-neutral-950">Notes: </span>
          {booking.notes.trim()}
        </p>
      ) : null}
      <div className="mt-3 rounded-md bg-white/75 p-2 backdrop-blur-sm">
      <BookingSmsButtons
        bookingId={booking.id}
        customerName={booking.name}
        phone={booking.phone}
        service={booking.service}
        appointmentIso={booking.date}
      />
      </div>
    </li>
  );
}
