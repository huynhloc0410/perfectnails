'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { adminDashboardBaseFromPathname, adminLoginPathFromPathname } from '@/app/lib/adminPublicPath';
import {
  addDays,
  formatWeekRangeLabel,
  mondayOfWeek,
  parseISODateLocal,
  startOfLocalDay,
  toISODateString,
} from '@/app/lib/adminWeekNav';
import { WeeklyHeader } from './components/WeeklyHeader';
import { WeekGrid } from './components/WeekGrid';

interface Employee {
  id: string;
  name: string;
  role: 'Water' | 'Powder' | 'Everything';
  phone: string;
}

interface Booking {
  id: string;
  name: string;
  phone: string;
  service: string;
  employee?: string;
  date: string;
  timeSlot: string;
  duration: number;
}

/** When true, days before today are not clickable. Keep false so past days stay open for history. */
const DISABLE_PAST_DATES = false;

function dayKeyLocal(d: Date): string {
  return toISODateString(startOfLocalDay(d));
}

export function BookingsCalendarClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const adminBase = adminDashboardBaseFromPathname(pathname);
  const bookingsBasePath = `${adminBase}/bookings`;
  const loginPath = adminLoginPathFromPathname(pathname);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [useCms, setUseCms] = useState(false);

  const rawDate = searchParams.get('date');

  const selectedDate = useMemo(() => {
    const parsed = rawDate ? parseISODateLocal(rawDate) : null;
    return parsed ?? startOfLocalDay(new Date());
  }, [rawDate]);

  useEffect(() => {
    const parsed = rawDate ? parseISODateLocal(rawDate) : null;
    if (!rawDate || !parsed) {
      const iso = toISODateString(startOfLocalDay(new Date()));
      router.replace(`${bookingsBasePath}?date=${encodeURIComponent(iso)}`);
    }
  }, [rawDate, router, bookingsBasePath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/cms/site');
        const data = await r.json();
        if (cancelled) return;
        if (data.configured === true && data.site && !data.error) {
          const s = data.site;
          setUseCms(true);
          if (Array.isArray(s.bookings)) setBookings(s.bookings as Booking[]);
          if (Array.isArray(s.employees)) setEmployees(s.employees as Employee[]);
        } else {
          const savedBookings = localStorage.getItem('admin-bookings');
          const savedEmployees = localStorage.getItem('admin-employees');
          if (savedBookings) setBookings(JSON.parse(savedBookings));
          if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
        }
      } catch {
        if (!cancelled) {
          const savedBookings = localStorage.getItem('admin-bookings');
          const savedEmployees = localStorage.getItem('admin-employees');
          if (savedBookings) setBookings(JSON.parse(savedBookings));
          if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedIso = toISODateString(selectedDate);
  const monday = mondayOfWeek(selectedDate);
  const sunday = addDays(monday, 6);
  const weekRangeLabel = formatWeekRangeLabel(monday, sunday);

  const navigateToDate = useCallback(
    (d: Date) => {
      const iso = toISODateString(startOfLocalDay(d));
      router.push(`${bookingsBasePath}?date=${encodeURIComponent(iso)}`);
    },
    [router, bookingsBasePath]
  );

  const onPrevWeek = useCallback(() => {
    navigateToDate(addDays(selectedDate, -7));
  }, [selectedDate, navigateToDate]);

  const onNextWeek = useCallback(() => {
    navigateToDate(addDays(selectedDate, 7));
  }, [selectedDate, navigateToDate]);

  const onToday = useCallback(() => {
    navigateToDate(startOfLocalDay(new Date()));
  }, [navigateToDate]);

  const dayBookings = useMemo(() => {
    const key = selectedIso;
    return bookings.filter((b) => dayKeyLocal(new Date(b.date)) === key).sort((a, b) => {
      const ta = (a.timeSlot || '').localeCompare(b.timeSlot || '');
      return ta;
    });
  }, [bookings, selectedIso]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* still navigate */
    }
    router.push(loginPath);
    router.refresh();
  };

  const dayTitle = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="flex flex-col gap-4 border-b border-champagne-600/25 bg-gradient-to-r from-neutral-950 via-neutral-900 to-champagne-950 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Bookings by day</h1>
              <p className="mt-1 text-champagne-200">Pick a day to review appointments</p>
              {useCms && (
                <p className="mt-1 text-sm text-champagne-300/90">Bookings sync from site data (S3 when configured).</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={adminBase}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                ← Admin dashboard
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[44px] items-center rounded-lg bg-champagne-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-champagne-300"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="space-y-6 border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white p-6">
            <WeeklyHeader
              weekRangeLabel={weekRangeLabel}
              onPrevWeek={onPrevWeek}
              onNextWeek={onNextWeek}
              onToday={onToday}
            />
            <WeekGrid
              anchorDate={selectedDate}
              selectedIso={selectedIso}
              bookingsBasePath={bookingsBasePath}
              disablePastDates={DISABLE_PAST_DATES}
            />
          </div>

          <div className="p-6">
            <div className="mb-4 flex flex-col gap-1 border-b border-gray-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{dayTitle}</h2>
              <span className="text-sm font-medium text-gray-500">{selectedIso}</span>
            </div>

            {dayBookings.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-gray-500">
                No bookings for this day.
              </p>
            ) : (
              <ul
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                role="list"
              >
                {dayBookings.map((booking) => {
                  const bookingEmployee = booking.employee
                    ? employees.find((e) => e.id === booking.employee)
                    : null;
                  const bookingDateObj = new Date(booking.date);
                  const apptTime =
                    booking.timeSlot ||
                    bookingDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const apptDate = bookingDateObj.toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <li
                      key={booking.id}
                      className="flex h-full min-h-[10rem] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-champagne-300 hover:shadow-md"
                    >
                      <p className="text-base font-semibold leading-snug text-gray-900">{booking.name}</p>
                      <p className="mt-1 text-sm font-medium text-champagne-800">
                        {apptDate} · {apptTime}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">Phone: {booking.phone}</p>
                      <p className="text-sm text-gray-600">Service: {booking.service}</p>
                      {bookingEmployee && (
                        <p className="text-sm text-gray-600">
                          Staff: <span className="font-semibold">{bookingEmployee.name}</span> ({bookingEmployee.role})
                        </p>
                      )}
                      <p className="mt-auto pt-3 text-sm text-gray-500">Duration: {booking.duration || 45} min</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
