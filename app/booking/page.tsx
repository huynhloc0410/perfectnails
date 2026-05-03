'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ADMIN_BOOKINGS_BROADCAST } from '@/app/lib/adminBookingBroadcast';
import { isValidUsCustomerPhone } from '@/lib/phone';
import InnerPageHero from '../components/InnerPageHero';
import { fetchCmsSite } from '../lib/cmsSiteClient';

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
const TIME_SLOT_STEP_MINUTES = 30;

type BusinessHours = { openMinutes: number; closeMinutes: number } | null;

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
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  /** 1 = service, 2 = stylist, 3 = date, 4 = time + contact + submit */
  const [bookingStep, setBookingStep] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCmsSite();
        if (cancelled) return;
        if (data.configured && data.site && !data.error) {
          if (Array.isArray(data.site.services)) {
            setServices(data.site.services as Service[]);
          }
          if (Array.isArray(data.site.employees)) {
            setEmployees(data.site.employees as Employee[]);
          }
          if (Array.isArray(data.site.bookings)) {
            setBookings(data.site.bookings as Booking[]);
          }
          return;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      const savedServices = localStorage.getItem('admin-services');
      const savedEmployees = localStorage.getItem('admin-employees');
      const savedBookings = localStorage.getItem('admin-bookings');
      if (savedServices) setServices(JSON.parse(savedServices));
      if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
      if (savedBookings) setBookings(JSON.parse(savedBookings));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Prefill service from /booking?service=... (e.g. Services → Book Now) */
  useEffect(() => {
    const fromUrl = serviceFromQuery?.trim();
    if (!fromUrl || services.length === 0) return;
    const match = services.find((s) => s.name === fromUrl);
    if (!match) return;
    setSelectedCategory(match.category || '');
    setFormData((prev) => {
      if (prev.service === match.name) return prev;
      return { ...prev, service: match.name, employee: '', date: '', timeSlot: '' };
    });
    setBookingStep(2);
  }, [services, serviceFromQuery]);

  // Filter employees based on selected service
  useEffect(() => {
    if (!formData.service) {
      setAvailableEmployees([]);
      return;
    }

    const selectedService = services.find(s => s.name === formData.service);
    if (!selectedService) {
      setAvailableEmployees([]);
      return;
    }

    // Determine which employees can do this service based on category
    const serviceCategory = selectedService.category?.toLowerCase() || '';
    const serviceName = selectedService.name.toLowerCase();

    const filtered = employees.filter(employee => {
      if (employee.role === 'Everything') return true;
      
      if (employee.role === 'Water') {
        return serviceCategory === 'manicure' || 
               serviceCategory === 'pedicure' ||
               serviceName.includes('manicure') ||
               serviceName.includes('pedicure');
      }
      
      if (employee.role === 'Powder') {
        return serviceCategory === 'acrylic' ||
               serviceCategory === 'gel x' ||
               serviceCategory === 'gel builder' ||
               serviceName.includes('acrylic') ||
               serviceName.includes('gel x') ||
               serviceName.includes('gel builder');
      }
      
      return false;
    });

    setAvailableEmployees(filtered);
    
    // Reset employee if current selection is not available
    if (formData.employee && !filtered.find(e => e.id === formData.employee)) {
      setFormData({ ...formData, employee: '', date: '', timeSlot: '' });
    }
  }, [formData.service, services, employees]);

  // Generate available time slots when service, employee, and date are selected
  useEffect(() => {
    if (!formData.service || !formData.employee || !formData.date) {
      setAvailableTimeSlots([]);
      return;
    }

    const selectedService = services.find(s => s.name === formData.service);
    if (!selectedService) {
      setAvailableTimeSlots([]);
      return;
    }

    const serviceDuration = schedulingMinutes(selectedService.duration);
    if (formData.employee === ANYBODY_EMPLOYEE_ID) {
      const merged = new Set<string>();
      for (const emp of availableEmployees) {
        const empSlots = generateTimeSlots(formData.date, emp.id, serviceDuration);
        for (const s of empSlots) merged.add(s);
      }
      const slots = Array.from(merged).sort((a, b) => a.localeCompare(b));
      setAvailableTimeSlots(slots);
    } else {
      const slots = generateTimeSlots(formData.date, formData.employee, serviceDuration);
      setAvailableTimeSlots(slots);
    }
  }, [formData.service, formData.employee, formData.date, bookings, services, availableEmployees]);

  // Generate time slots for a given date, employee, and service duration
  const generateTimeSlots = (date: string, employeeId: string, duration: number): string[] => {
    const slots: string[] = [];
    // Parse date string (YYYY-MM-DD) in local timezone
    const [year, month, day] = date.split('-').map(Number);
    const selectedDateObj = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Don't show slots for past dates
    if (selectedDateObj < today) {
      return [];
    }

    const hours = getBusinessHoursForDate(selectedDateObj);
    if (!hours) {
      return [];
    }

    // Get existing bookings for this employee on this date
    const employeeBookings = bookings.filter(b => {
      if (b.employee !== employeeId) return false;
      const start = bookingStartDateTime(b);
      if (!start) return false;
      return localDayKey(start) === localDayKey(selectedDateObj);
    });

    // Latest start depends on the selected service length (and buffer).
    // Example: close 7:00 PM with a 60-min service → last start 6:00 PM.
    const rawLatestStartMinutes = hours.closeMinutes - (duration + BUFFER_TIME);
    const latestStartMinutes =
      Math.floor(rawLatestStartMinutes / TIME_SLOT_STEP_MINUTES) * TIME_SLOT_STEP_MINUTES;
    if (latestStartMinutes < hours.openMinutes) return [];

    // Generate slots (30-minute increments) within business hours
    for (
      let startMinutes = hours.openMinutes;
      startMinutes <= latestStartMinutes;
      startMinutes += TIME_SLOT_STEP_MINUTES
    ) {
      const hour = Math.floor(startMinutes / 60);
      const minute = startMinutes % 60;
      const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotDateTime = new Date(selectedDateObj);
      slotDateTime.setHours(hour, minute, 0, 0);
        
        // Check if slot is in the past (for today)
        if (selectedDateObj.toDateString() === today.toDateString() && slotDateTime < new Date()) {
          continue;
        }

        // Check if slot fits the service duration
        const slotEndTime = new Date(slotDateTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + duration + BUFFER_TIME);
        if (minutesSinceMidnight(slotEndTime) > hours.closeMinutes) continue;

        // Check if slot conflicts with existing bookings
        const isAvailable = !employeeBookings.some(booking => {
          const bookingTime = bookingStartDateTime(booking);
          if (!bookingTime) return false;
          const bookingEndTime = new Date(bookingTime);
          bookingEndTime.setMinutes(bookingEndTime.getMinutes() + bookingDurationMinutes(booking) + BUFFER_TIME);
          
          // Check if slots overlap
          return (slotDateTime >= bookingTime && slotDateTime < bookingEndTime) ||
                 (slotEndTime > bookingTime && slotEndTime <= bookingEndTime) ||
                 (slotDateTime <= bookingTime && slotEndTime >= bookingEndTime);
        });

        if (isAvailable) {
          slots.push(slotTime);
        }
    }

    return slots;
  };

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

    const selectedService = services.find(s => s.name === formData.service);
    const serviceDuration = schedulingMinutes(selectedService?.duration);

    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('phone', formData.phone);
    formDataObj.append('service', formData.service);
    formDataObj.append('employee', formData.employee === ANYBODY_EMPLOYEE_ID ? '' : formData.employee);
    formDataObj.append('date', formData.date);
    formDataObj.append('timeSlot', formData.timeSlot);
    formDataObj.append('duration', serviceDuration.toString());

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        body: formDataObj,
      });

      const result = await response.json();
      
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
        setAvailableTimeSlots([]);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const selectedService = services.find(s => s.name === formData.service);
  const categories = Array.from(
    new Set(
      services
        .map((s) => (s.category || '').trim())
        .filter((c) => c.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const filteredServices = selectedCategory
    ? services.filter((s) => (s.category || '').trim() === selectedCategory)
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
            {categories.length > 0 ? (
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
            {services.length > 0 ? (
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
            ) : (
              <p className="text-sm text-lux-espressoLight/75">No services available. Please contact us directly.</p>
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
              
              {/* Time slots (compact grid) */}
              {availableTimeSlots.length > 0 ? (
                <div className="rounded-xl border border-champagne-200/70 bg-white p-3">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {availableTimeSlots.map((slot) => {
                      const isSelected = formData.timeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFormData({ ...formData, timeSlot: slot })}
                          className={`
                            rounded-md px-3 py-2 text-sm font-semibold transition
                            ${isSelected
                              ? 'bg-champagne-600 text-white shadow-sm'
                              : 'border border-champagne-200/80 bg-lux-mist/40 text-lux-espresso hover:bg-champagne-100 hover:text-champagne-700'
                            }
                          `}
                        >
                          {slot}
                        </button>
                      );
                    })}
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
