'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ADMIN_BOOKINGS_BROADCAST } from '@/lib/admin/booking-broadcast';
import { isValidUsCustomerPhone } from '@/lib/phone';
import InnerPageHero from '../components/InnerPageHero';
import { fetchCmsSite, SITE_DATA_UPDATED_EVENT } from '@/lib/cms/site-client';
import { coerceBookingBlocksList, type CmsBookingBlock } from '@/lib/cmsSiteTypes';
import {
  isBookingWindowBlocked,
  overlapsSalonWideBookingWindow,
  overlapsStylistScopedBookingWindow,
} from '@/lib/bookingBlocks';
import {
  BOOKING_SLOT_STEP_MINUTES,
  getEarliestBookableSlotStart,
  isSlotStartAllowedForBooking,
} from '@/lib/bookingLeadTime';
import { employeeCanPerformService, isNonBookableAddonService } from '@/lib/booking/serviceEmployeeMatch';

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
  duration: number;
}

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

const BUFFER_TIME = 0; // minutes between appointments
const ANYBODY_EMPLOYEE_ID = '__anybody__';

type BusinessHours = { openMinutes: number; closeMinutes: number } | null;

type BookingSlotRow = {
  time: string;
  state: 'open' | 'salon_blocked' | 'staff_blocked' | 'fully_booked';
};

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function getBusinessHoursForDate(dateLocal: Date): BusinessHours {
  // 0 = Sunday, 6 = Saturday
  const dow = dateLocal.getDay();
  if (dow === 0) return null; // Sunday closed
  if (dow === 6) {
    // Saturday: 9:30 AM - 7:00 PM
    return { openMinutes: 9 * 60 + 30, closeMinutes: 19 * 60 };
  }
  // Mon - Fri: 9:30 AM - 7:00 PM
  return { openMinutes: 9 * 60 + 30, closeMinutes: 19 * 60 };
}

function parseLocalDateYYYYMMDD(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bookingStartDateTime(booking: Booking): Date | null {
  // Some legacy bookings may store only the date in `booking.date` and the time in `timeSlot`.
  // To reliably detect overlaps, reconstruct a local datetime from both fields when possible.
  let base: Date;
  if (typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
    base = parseLocalDateYYYYMMDD(booking.date);
  } else {
    base = new Date(booking.date);
  }
  if (!Number.isFinite(base.getTime())) return null;

  const t = (booking.timeSlot || '').trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh, mm, 0, 0);
      return dt;
    }
  }

  // Fallback: whatever is in `booking.date` already includes a time.
  return base;
}

function bookingDurationMinutes(booking: Booking): number {
  const raw = (booking as unknown as { duration?: unknown }).duration;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

/** Admin can set duration to 0 to hide time on Services; scheduling still uses 45 min. */
function schedulingMinutes(duration: number | undefined): number {
  if (typeof duration === 'number' && duration > 0) return duration;
  return 45;
}

export default function Booking() {
  const searchParams = useSearchParams();
  const serviceFromQuery = searchParams.get('service');
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingBlocks, setBookingBlocks] = useState<CmsBookingBlock[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    service: '', 
    employee: '',
    date: '',
    timeSlot: ''
  });
  const [bookingSuccessModalOpen, setBookingSuccessModalOpen] = useState(false);
  /** Set true only after failed submit (invalid phone); cleared when user edits phone. */
  const [phoneSubmitError, setPhoneSubmitError] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [timeSlotChoices, setTimeSlotChoices] = useState<BookingSlotRow[]>([]);
  /** Bumps periodically so same-day slots respect minimum notice as time passes */
  const [slotClock, setSlotClock] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  /** 1 = service, 2 = stylist, 3 = date, 4 = time + contact + submit */
  const [bookingStep, setBookingStep] = useState(1);

  const loadSiteDataForBooking = useCallback(async () => {
    try {
      const data = await fetchCmsSite();
      if (data.configured && data.site && !data.error) {
        const site = data.site;
        if (Array.isArray(site.services)) {
          setServices(site.services as Service[]);
        }
        if (Array.isArray(site.employees)) {
          setEmployees(site.employees as Employee[]);
        }
        if (Array.isArray(site.bookings)) {
          setBookings(site.bookings as Booking[]);
        }
        setBookingBlocks(coerceBookingBlocksList(site.bookingBlocks as unknown[]));
        return;
      }
    } catch {
      /* local fallback below */
    }
    const savedServices = localStorage.getItem('admin-services');
    const savedEmployees = localStorage.getItem('admin-employees');
    const savedBookings = localStorage.getItem('admin-bookings');
    const savedBlocks = localStorage.getItem('admin-booking-blocks');
    if (savedServices) setServices(JSON.parse(savedServices));
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    if (savedBookings) setBookings(JSON.parse(savedBookings));
    if (savedBlocks) {
      try {
        const parsed = JSON.parse(savedBlocks) as unknown[];
        setBookingBlocks(coerceBookingBlocksList(parsed));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    void loadSiteDataForBooking();
  }, [loadSiteDataForBooking]);

  useEffect(() => {
    const onSiteUpdated = () => {
      void loadSiteDataForBooking();
    };
    const onStorage = (e: StorageEvent) => {
      const k = e.key;
      if (k === null || k === 'admin-booking-blocks' || k === 'admin-bookings' || k === 'admin-employees') {
        void loadSiteDataForBooking();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadSiteDataForBooking();
        setSlotClock((n) => n + 1);
      }
    };
    window.addEventListener(SITE_DATA_UPDATED_EVENT, onSiteUpdated);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(SITE_DATA_UPDATED_EVENT, onSiteUpdated);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadSiteDataForBooking]);

  useEffect(() => {
    const id = window.setInterval(() => setSlotClock((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  /** Services that may be booked online (excludes add-on / "Additional …" line items). */
  const bookableServices = useMemo(
    () => services.filter((s) => !isNonBookableAddonService(s)),
    [services],
  );

  /** If CMS drops bookable status for the current selection, reset the flow. */
  useEffect(() => {
    if (!formData.service) return;
    const s = services.find((x) => x.name === formData.service);
    if (!s || !isNonBookableAddonService(s)) return;
    setFormData((prev) => ({ ...prev, service: '', employee: '', date: '', timeSlot: '' }));
    setSelectedCategory('');
    setBookingStep(1);
  }, [services, formData.service]);

  /** Prefill service from /booking?service=... (e.g. Services → Book Now). Skips add-on / non-bookable rows. */
  useEffect(() => {
    const fromUrl = serviceFromQuery?.trim();
    if (!fromUrl || bookableServices.length === 0) return;
    const match = bookableServices.find((s) => s.name === fromUrl);
    if (!match) return;
    setSelectedCategory(match.category || '');
    setFormData((prev) => {
      if (prev.service === match.name) return prev;
      return { ...prev, service: match.name, employee: '', date: '', timeSlot: '' };
    });
    setBookingStep(2);
  }, [bookableServices, serviceFromQuery]);

  // Filter employees based on selected service
  useEffect(() => {
    if (!formData.service) {
      setAvailableEmployees([]);
      return;
    }

    const selectedService = services.find((s) => s.name === formData.service);
    if (!selectedService || isNonBookableAddonService(selectedService)) {
      setAvailableEmployees([]);
      return;
    }

    const filtered = employees.filter((employee) =>
      employeeCanPerformService(employee, selectedService),
    );

    setAvailableEmployees(filtered);
    
    // Reset employee if current selection is not available
    if (formData.employee && !filtered.find(e => e.id === formData.employee)) {
      setFormData({ ...formData, employee: '', date: '', timeSlot: '' });
    }
  }, [formData.service, services, employees]);

  const buildTimeSlotChoices = useCallback(
    (
      date: string,
      mode: { kind: 'stylist'; id: string } | { kind: 'any'; employees: Employee[] },
      duration: number
    ): BookingSlotRow[] => {
      const rows: BookingSlotRow[] = [];
      const [year, month, day] = date.split('-').map(Number);
      const selectedDateObj = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDateObj < today) {
        return [];
      }

      const hours = getBusinessHoursForDate(selectedDateObj);
      if (!hours) {
        return [];
      }

      const rawLatestStartMinutes = hours.closeMinutes - (duration + BUFFER_TIME);
      const latestStartMinutes =
        Math.floor(rawLatestStartMinutes / BOOKING_SLOT_STEP_MINUTES) *
        BOOKING_SLOT_STEP_MINUTES;
      if (latestStartMinutes < hours.openMinutes) return [];

      const now = new Date();
      const earliestBookableStart = getEarliestBookableSlotStart(now);

      const employeeBookingsOnDay = (employeeId: string) =>
        bookings.filter((b) => {
          if (b.employee !== employeeId) return false;
          const start = bookingStartDateTime(b);
          if (!start) return false;
          return localDayKey(start) === localDayKey(selectedDateObj);
        });

      const slotConflictsBooking = (employeeId: string, slotDateTime: Date, slotEndTime: Date) =>
        employeeBookingsOnDay(employeeId).some((booking) => {
          const bookingTime = bookingStartDateTime(booking);
          if (!bookingTime) return false;
          const bookingEndTime = new Date(bookingTime);
          bookingEndTime.setMinutes(
            bookingEndTime.getMinutes() + bookingDurationMinutes(booking) + BUFFER_TIME
          );
          return (
            (slotDateTime >= bookingTime && slotDateTime < bookingEndTime) ||
            (slotEndTime > bookingTime && slotEndTime <= bookingEndTime) ||
            (slotDateTime <= bookingTime && slotEndTime >= bookingEndTime)
          );
        });

      for (
        let startMinutes = hours.openMinutes;
        startMinutes <= latestStartMinutes;
        startMinutes += BOOKING_SLOT_STEP_MINUTES
      ) {
        const hour = Math.floor(startMinutes / 60);
        const minute = startMinutes % 60;
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDateTime = new Date(selectedDateObj);
        slotDateTime.setHours(hour, minute, 0, 0);

        if (slotDateTime.getTime() < earliestBookableStart.getTime()) {
          continue;
        }

        const slotEndTime = new Date(slotDateTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + duration + BUFFER_TIME);
        if (minutesSinceMidnight(slotEndTime) > hours.closeMinutes) continue;

        const salonClosed = overlapsSalonWideBookingWindow({
          dateYmd: date,
          slotStartLocal: slotDateTime,
          slotEndExclusiveLocal: slotEndTime,
          blocks: bookingBlocks,
        });

        let state: BookingSlotRow['state'];

        if (mode.kind === 'stylist') {
          if (salonClosed) {
            state = 'salon_blocked';
          } else if (slotConflictsBooking(mode.id, slotDateTime, slotEndTime)) {
            state = 'fully_booked';
          } else if (
            overlapsStylistScopedBookingWindow({
              dateYmd: date,
              employeeId: mode.id,
              slotStartLocal: slotDateTime,
              slotEndExclusiveLocal: slotEndTime,
              blocks: bookingBlocks,
            })
          ) {
            state = 'staff_blocked';
          } else {
            state = 'open';
          }
        } else if (salonClosed) {
          state = 'salon_blocked';
        } else {
          const anyFree = mode.employees.some(
            (e) =>
              !slotConflictsBooking(e.id, slotDateTime, slotEndTime) &&
              !overlapsStylistScopedBookingWindow({
                dateYmd: date,
                employeeId: e.id,
                slotStartLocal: slotDateTime,
                slotEndExclusiveLocal: slotEndTime,
                blocks: bookingBlocks,
              })
          );
          state = anyFree ? 'open' : 'fully_booked';
        }

        rows.push({ time: slotTime, state });
      }

      return rows;
    },
    [bookings, bookingBlocks],
  );

  // Build time rows (open + greyed) when service, employee, and date are selected
  useEffect(() => {
    if (!formData.service || !formData.employee || !formData.date) {
      setTimeSlotChoices([]);
      return;
    }

    const selectedService = bookableServices.find((s) => s.name === formData.service);
    if (!selectedService) {
      setTimeSlotChoices([]);
      return;
    }

    const serviceDuration = schedulingMinutes(selectedService.duration);
    const mode: { kind: 'stylist'; id: string } | { kind: 'any'; employees: Employee[] } =
      formData.employee === ANYBODY_EMPLOYEE_ID
        ? { kind: 'any', employees: availableEmployees }
        : { kind: 'stylist', id: formData.employee };

    setTimeSlotChoices(buildTimeSlotChoices(formData.date, mode, serviceDuration));
  }, [
    formData.service,
    formData.employee,
    formData.date,
    bookableServices,
    availableEmployees,
    slotClock,
    buildTimeSlotChoices,
  ]);

  useEffect(() => {
    if (!formData.timeSlot) return;
    const row = timeSlotChoices.find((r) => r.time === formData.timeSlot);
    if (!row || row.state !== 'open') {
      setFormData((prev) => ({ ...prev, timeSlot: '' }));
    }
  }, [timeSlotChoices, formData.timeSlot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.timeSlot || !formData.date) {
      alert('Please select a date and time slot');
      return;
    }

    if (!isValidUsCustomerPhone(formData.phone)) {
      setPhoneSubmitError(true);
      return;
    }

    const selectedService = services.find((s) => s.name === formData.service);
    if (!selectedService || isNonBookableAddonService(selectedService)) {
      alert(
        'Please choose a main service. Add-ons and extras are arranged in the salon with your appointment, not booked alone online.',
      );
      return;
    }
    const serviceDuration = schedulingMinutes(selectedService.duration);

    const effectiveEmp =
      formData.employee === ANYBODY_EMPLOYEE_ID ? '' : formData.employee.trim();
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(formData.date.trim());
    const hm = /^(\d{1,2}):(\d{2})$/.exec(formData.timeSlot.trim());
    if (!parts || !hm) {
      alert('Invalid date or time.');
      return;
    }
    const yy = parseInt(parts[1], 10);
    const mo = parseInt(parts[2], 10);
    const dd = parseInt(parts[3], 10);
    const hh = parseInt(hm[1], 10);
    const mins = parseInt(hm[2], 10);
    const slotStart = new Date(yy, mo - 1, dd, hh, mins, 0, 0);
    const slotEndExclusive = new Date(slotStart.getTime());
    slotEndExclusive.setMinutes(slotEndExclusive.getMinutes() + serviceDuration + BUFFER_TIME);
    if (!isSlotStartAllowedForBooking(slotStart, new Date())) {
      alert(
        'Appointments must be at least 30 minutes from now. Please choose a later time slot.'
      );
      return;
    }
    if (
      isBookingWindowBlocked({
        dateYmd: formData.date.trim(),
        employeeId: effectiveEmp,
        slotStartLocal: slotStart,
        slotEndExclusiveLocal: slotEndExclusive,
        blocks: bookingBlocks,
      })
    ) {
      if (
        overlapsSalonWideBookingWindow({
          dateYmd: formData.date.trim(),
          slotStartLocal: slotStart,
          slotEndExclusiveLocal: slotEndExclusive,
          blocks: bookingBlocks,
        })
      ) {
        alert('Salon unavailable during this time. Please choose a different slot.');
      } else {
        alert('That time is in a blocked window. Please choose another slot.');
      }
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('phone', formData.phone);
    formDataObj.append('service', formData.service);
    formDataObj.append('employee', formData.employee === ANYBODY_EMPLOYEE_ID ? '' : formData.employee);
    formDataObj.append('date', formData.date);
    formDataObj.append('timeSlot', formData.timeSlot);
    formDataObj.append('duration', serviceDuration.toString());
    /** Same instant as slotStart — API uses this so min_notice matches the browser (server TZ is often UTC). */
    formDataObj.append('slotStartIso', slotStart.toISOString());

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        body: formDataObj,
      });

      const result = await response.json();

      if (response.status === 400 && result?.error === 'invalid_service') {
        alert(
          'That service cannot be booked online. Choose a main service, or call us to add extras.',
        );
        return;
      }

      if (response.status === 400 || result?.error === 'min_notice') {
        alert(
          'Appointments must be at least 30 minutes from now. Please choose a later time slot.'
        );
        return;
      }

      if (response.status === 409 || result?.error === 'time_blocked') {
        alert('That time is no longer available. Please choose a different slot.');
        return;
      }

      if (result.success) {
        const savedBookings = localStorage.getItem('admin-bookings') || '[]';
        const bookingsList = JSON.parse(savedBookings);
        bookingsList.push(result.booking);
        localStorage.setItem('admin-bookings', JSON.stringify(bookingsList));
        setBookings(bookingsList);

        try {
          const bc = new BroadcastChannel(ADMIN_BOOKINGS_BROADCAST);
          bc.postMessage({ type: 'booking-created', booking: result.booking });
          bc.close();
        } catch {
          /* BroadcastChannel may be unavailable */
        }
        
        setBookingSuccessModalOpen(true);
        setPhoneSubmitError(false);
        setFormData({ name: '', phone: '', service: '', employee: '', date: '', timeSlot: '' });
        setSelectedCategory('');
        setBookingStep(1);
        setTimeSlotChoices([]);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const selectedService = bookableServices.find((s) => s.name === formData.service);
  const categories = Array.from(
    new Set(
      bookableServices
        .map((s) => (s.category || '').trim())
        .filter((c) => c.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const filteredServices = selectedCategory
    ? bookableServices.filter((s) => (s.category || '').trim() === selectedCategory)
    : [];

  // Calendar functions
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days from 1 to last day of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const isDateSelectable = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    
    // Sunday closed
    if (date.getDay() === 0) return false;
    return date >= today && date <= maxDate;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!formData.date) return false;
    // Parse date string (YYYY-MM-DD) in local timezone
    const [year, month, day] = formData.date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);

  return (
    <div>
      <InnerPageHero
        breadcrumbLabel="Booking"
        title="Book an Appointment"
        subtitle="Request a time — we'll confirm by phone or text. Most requests take just a minute to send."
      />

      <div className="container mx-auto border-t border-lux-line/35 px-6 py-10">
      <div className="max-w-4xl mx-auto">
        
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/50"
        >
          <ol className="flex flex-wrap gap-2 border-b border-champagne-200/80 pb-4" aria-label="Booking steps">
            {(['Service', 'Stylist', 'Date', 'Details'] as const).map((label, i) => {
              const n = i + 1;
              const active = bookingStep === n;
              const done = bookingStep > n;
              return (
                <li key={label} className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs sm:h-8 sm:w-8 ${
                      done
                        ? 'bg-champagne-600 text-white'
                        : active
                          ? 'bg-champagne-100 text-champagne-900 ring-2 ring-champagne-500/50'
                          : 'bg-lux-mist/80 text-lux-espressoLight/80'
                    }`}
                  >
                    {done ? '✓' : n}
                  </span>
                  <span className={active || done ? 'text-lux-espresso' : 'text-lux-espressoLight/75'}>{label}</span>
                  {i < 3 && (
                    <span className="mx-1 hidden text-lux-line sm:inline" aria-hidden>
                      /
                    </span>
                  )}
                </li>
              );
            })}
          </ol>

          {bookingStep === 1 && (
            <>
          <div>
            <label className="block mb-1 text-sm font-medium text-lux-espresso">Select Category *</label>
            {services.length > 0 && bookableServices.length === 0 ? (
              <p className="text-sm text-lux-espressoLight/75">
                Online booking lists main services only. Add-ons and additional services are scheduled with your main service in the salon — call us if you need help choosing.
              </p>
            ) : categories.length > 0 ? (
              <select
                name="category"
                value={selectedCategory}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedCategory(next);
                  setFormData((prev) => ({
                    ...prev,
                    service: '',
                    employee: '',
                    date: '',
                    timeSlot: '',
                  }));
                }}
                className="w-full rounded-md border border-champagne-300/70 px-4 py-2 focus:border-champagne-500 focus:ring-champagne-500"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-lux-espressoLight/75">No categories available. Please contact us directly.</p>
            )}
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-lux-espresso">Select Service *</label>
            {services.length === 0 ? (
              <p className="text-sm text-lux-espressoLight/75">No services available. Please contact us directly.</p>
            ) : bookableServices.length === 0 ? (
              <p className="text-sm text-lux-espressoLight/75">
                No bookable services are listed yet. Please contact us directly.
              </p>
            ) : (
              <select
                name="service"
                value={formData.service}
                onChange={(e) =>
                  setFormData({ ...formData, service: e.target.value, employee: '', date: '', timeSlot: '' })
                }
                className="w-full rounded-md border border-champagne-300/70 px-4 py-2 focus:border-champagne-500 focus:ring-champagne-500 disabled:bg-lux-mist/50 disabled:text-lux-espressoLight/60"
                required
                disabled={!selectedCategory}
              >
                <option value="">
                  {selectedCategory ? 'Select a service' : 'Please select a category first'}
                </option>
                {filteredServices.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name} - ${service.price.toFixed(2)}
                    {service.duration !== 0 ? ` (${schedulingMinutes(service.duration)} min)` : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedService && selectedService.duration !== 0 && (
              <p className="mt-1 text-xs text-lux-espressoLight/75">
                Duration: {schedulingMinutes(selectedService.duration)} minutes
              </p>
            )}
          </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedCategory && formData.service) setBookingStep(2);
                }}
                disabled={!selectedCategory || !formData.service}
                className="rounded-xl bg-champagne-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-champagne-700 disabled:cursor-not-allowed disabled:bg-champagne-200/80 disabled:text-lux-espresso/50"
              >
                Continue
              </button>
            </div>
            </>
          )}

          {bookingStep === 2 && (
            <>
              <div>
                <label className="block mb-1 text-sm font-medium text-lux-espresso">Preferred nail technician *</label>
                <p className="mb-2 text-xs text-lux-espressoLight/75">
                  Choose someone you love — our team is scheduled by specialty so you get the right fit.
                </p>
                {availableEmployees.length > 0 ? (
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={(e) => setFormData({ ...formData, employee: e.target.value, date: '', timeSlot: '' })}
                    className="w-full rounded-md border border-champagne-300/70 px-4 py-2 focus:border-champagne-500 focus:ring-champagne-500"
                    required
                    disabled={!formData.service}
                  >
                    <option value="">
                      {formData.service ? 'Select a team member' : 'Please select a service first'}
                    </option>
                    <option value={ANYBODY_EMPLOYEE_ID}>Anybody (no preference)</option>
                    {availableEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                ) : formData.service ? (
                  <div className="px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-yellow-700 text-sm">
                    No team members are available for this service in the schedule yet. Try another service or call us.
                  </div>
                ) : (
                  <p className="text-lux-espressoLight/75 text-sm">Please select a service first</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBookingStep(1)}
                  className="rounded-xl border border-champagne-300/70 bg-white px-5 py-2.5 text-sm font-semibold text-lux-espresso hover:bg-champagne-50/70"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.employee) setBookingStep(3);
                  }}
                  disabled={!formData.employee}
                  className="rounded-xl bg-champagne-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-champagne-700 disabled:cursor-not-allowed disabled:bg-champagne-200/80 disabled:text-lux-espresso/50"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {bookingStep === 3 && formData.service && formData.employee && (
            <div>
              <label className="block mb-3 text-sm font-medium text-lux-espresso">Select Date *</label>
              
              {/* Calendar */}
              <div className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-champagne-200/70">
                {/* Month Navigation */}
                <div className="flex items-center justify-between border-b border-champagne-200/70 bg-champagne-50 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => navigateMonth('prev')}
                    className="px-1.5 py-0.5 text-champagne-600 hover:bg-champagne-100 rounded transition text-xs"
                  >
                    ←
                  </button>
                  <h3 className="text-sm font-semibold text-lux-espresso">
                    {formatMonthYear(currentMonth)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigateMonth('next')}
                    disabled={currentMonth.getMonth() === maxDate.getMonth() && currentMonth.getFullYear() === maxDate.getFullYear()}
                    className="px-1.5 py-0.5 text-champagne-600 hover:bg-champagne-100 rounded transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="p-2 w-full">
                  {/* Day headers */}
                  <div 
                    className="mb-0.5"
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '2px',
                      width: '100%'
                    }}
                  >
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                      <div key={idx} className="py-0.5 text-center text-[10px] font-semibold text-lux-espressoLight">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '2px',
                      width: '100%'
                    }}
                  >
                    {daysInMonth.map((date, index) => {
                      if (date === null) {
                        return <div key={index} style={{ height: '28px' }}></div>;
                      }
                      
                      const isSelectable = isDateSelectable(date);
                      const isSelected = isDateSelected(date);
                      const isTodayDate = isToday(date);
                      // Format date in local timezone to avoid UTC conversion issues
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            if (isSelectable) {
                              setFormData({ ...formData, date: dateStr, timeSlot: '' });
                            }
                          }}
                          disabled={!isSelectable}
                          className={`
                            rounded text-[11px] font-medium transition flex items-center justify-center
                            ${!isSelectable 
                              ? 'cursor-not-allowed bg-lux-mist/60 text-lux-line' 
                              : isSelected
                              ? 'bg-champagne-600 text-white shadow-sm font-semibold'
                              : isTodayDate
                              ? 'bg-champagne-100 text-champagne-700 hover:bg-champagne-200 font-semibold border border-champagne-400'
                              : 'border border-champagne-200/80 bg-white text-lux-espresso hover:bg-champagne-50/80 hover:text-champagne-700'
                            }
                          `}
                          style={{ height: '28px', width: '100%' }}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {formData.date && (
                <div className="mt-2 text-sm text-lux-espressoLight">
                  <span className="font-medium text-champagne-600">✓</span> {formatDate(parseLocalDateYYYYMMDD(formData.date))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setBookingStep(2)}
                  className="rounded-xl border border-champagne-300/70 bg-white px-5 py-2.5 text-sm font-semibold text-lux-espresso hover:bg-champagne-50/70"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.date) setBookingStep(4);
                  }}
                  disabled={!formData.date}
                  className="rounded-xl bg-champagne-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-champagne-700 disabled:cursor-not-allowed disabled:bg-champagne-200/80 disabled:text-lux-espresso/50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {bookingStep === 4 && formData.date && formData.service && formData.employee && (
            <div>
              <label className="block mb-3 text-sm font-medium text-lux-espresso">Select Time *</label>
              
              {/* Time slots (compact grid — open selectable; blocked/booked greyed out) */}
              {timeSlotChoices.length > 0 ? (
                <div className="space-y-3">
                  {timeSlotChoices.some((r) => r.state === 'salon_blocked') && (
                    <p
                      className="rounded-lg border border-amber-200/90 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                      role="status"
                    >
                      Salon unavailable during this time. Greyed-out slots cannot be booked.
                    </p>
                  )}
                  {!timeSlotChoices.some((r) => r.state === 'open') && (
                    <p className="rounded-lg border border-champagne-200/90 bg-champagne-50/90 px-4 py-3 text-sm text-lux-espresso">
                      No open appointments left for this day with your selection. Blocks and existing
                      bookings may limit times below.
                    </p>
                  )}
                  <div className="rounded-xl border border-champagne-200/70 bg-white p-3">
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {timeSlotChoices.map((row) => {
                        const isSelectable = row.state === 'open';
                        const isSelected =
                          Boolean(isSelectable && formData.timeSlot === row.time);

                        let title =
                          row.state === 'salon_blocked'
                            ? 'Salon unavailable — whole-salon blocked window.'
                            : row.state === 'staff_blocked'
                              ? 'This stylist is unavailable for this window.'
                              : row.state === 'fully_booked'
                                ? 'This time slot is already booked.'
                                : 'Select this time slot.';

                        return (
                          <button
                            key={row.time}
                            type="button"
                            disabled={!isSelectable}
                            title={title}
                            aria-disabled={!isSelectable}
                            onClick={() => {
                              if (isSelectable) {
                                setFormData({ ...formData, timeSlot: row.time });
                              }
                            }}
                            className={[
                              'rounded-md px-3 py-2 text-sm font-semibold transition',
                              isSelectable
                                ? isSelected
                                  ? 'bg-champagne-600 text-white shadow-sm'
                                  : 'border border-champagne-200/80 bg-lux-mist/40 text-lux-espresso hover:bg-champagne-100 hover:text-champagne-700'
                                : 'cursor-not-allowed border border-champagne-200/50 bg-neutral-50 text-lux-espressoLight/55 opacity-75',
                            ].join(' ')}
                          >
                            {row.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-3 border border-red-300 bg-red-50 rounded-md text-red-700 text-sm">
                  No available time slots for this date. Please select a different date.
                </div>
              )}

              {formData.timeSlot && (
                <div className="mt-2 text-sm text-lux-espressoLight">
                  <span className="font-medium text-champagne-600">✓</span> {formData.timeSlot}
                  {selectedService?.duration !== 0 && (
                    <span> ({schedulingMinutes(selectedService?.duration)} min)</span>
                  )}
                </div>
              )}

              <div className="mt-5 border-t border-champagne-200/80 pt-5">
                <h3 className="font-display text-base font-medium text-lux-espresso">Your contact info</h3>
                <p className="mt-1 text-xs text-lux-espressoLight/75">We&apos;ll use this to confirm your appointment.</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-lux-espresso">Your name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="First and last name"
                      className="w-full rounded-md border border-champagne-300/70 px-4 py-2 focus:border-champagne-500 focus:ring-champagne-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-lux-espresso">Phone number *</label>
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setPhoneSubmitError(false);
                        setFormData({ ...formData, phone: e.target.value });
                      }}
                      placeholder="(602) 123-4567 or 6021234567"
                      className={`w-full rounded-md border px-4 py-2 focus:ring-champagne-500 ${
                        phoneSubmitError
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-champagne-300/70 focus:border-champagne-500'
                      }`}
                      required
                      aria-invalid={phoneSubmitError}
                      aria-describedby={phoneSubmitError ? 'booking-phone-error' : undefined}
                    />
                    {phoneSubmitError && (
                      <p id="booking-phone-error" className="mt-1 text-sm text-red-600" role="alert">
                        Wrong phone number
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setBookingStep(3)}
                  className="rounded-xl border border-champagne-300/70 bg-white px-5 py-2.5 text-sm font-semibold text-lux-espresso hover:bg-champagne-50/70 sm:order-1"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-champagne-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-champagne-700 disabled:cursor-not-allowed disabled:bg-champagne-200/80 disabled:text-lux-espresso/50 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:order-2"
                  disabled={
                    !formData.employee ||
                    !formData.service ||
                    !formData.date ||
                    !formData.timeSlot ||
                    !formData.name.trim() ||
                    !formData.phone.trim()
                  }
                >
                  Book Now
                </button>
              </div>
            </div>
          )}
        </form>

        {bookingSuccessModalOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-success-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setBookingSuccessModalOpen(false)}
              aria-label="Close dialog"
            />
            <div className="relative z-[101] w-full max-w-md rounded-2xl border border-champagne-200 bg-white p-6 shadow-xl">
              <h2 id="booking-success-title" className="font-display text-lg font-semibold text-lux-espresso">
                Thank you
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-lux-espressoLight">
                Your booking was successful. You will receive a confirmation message within 5–10 minutes.
              </p>
              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-champagne-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-champagne-700"
                onClick={() => setBookingSuccessModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
