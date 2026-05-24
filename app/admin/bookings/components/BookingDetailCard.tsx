'use client';

import {
  adminBookingCardClasses,
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

  return (
    <li
      className={`w-full min-w-[14rem] max-w-md flex-1 basis-56 rounded-lg border p-4 shadow-sm transition ${adminBookingCardClasses(kind)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-base font-semibold leading-snug text-gray-900">{booking.name}</p>
        <button
          type="button"
          onClick={() => onDelete(booking.id)}
          className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
        >
          Delete
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-600">Phone: {booking.phone}</p>
      <p className={adminBookingServiceTextClasses(kind)}>Service: {booking.service}</p>
      {bookingEmployee && (
        <p className="text-sm text-gray-600">
          Staff: <span className="font-semibold">{bookingEmployee.name}</span> ({bookingEmployee.role})
        </p>
      )}
      <p className="mt-3 text-sm text-gray-500">Duration: {booking.duration || 45} min</p>
      <BookingSmsButtons
        bookingId={booking.id}
        customerName={booking.name}
        phone={booking.phone}
        service={booking.service}
        appointmentIso={booking.date}
      />
    </li>
  );
}
