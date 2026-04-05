'use client';

import { useState, useEffect } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';
import PageHeroRule from '../components/PageHeroRule';
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

const BUFFER_TIME = 10; // 10 minutes buffer between appointments
const BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 19, // 7 PM
};

/** Admin can set duration to 0 to hide time on Services; scheduling still uses 45 min. */
function schedulingMinutes(duration: number | undefined): number {
  if (typeof duration === 'number' && duration > 0) return duration;
  return 45;
}

export default function Booking() {
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [formData, setFormData] = useState({ 
    name: '', 
    phone: '', 
    service: '', 
    employee: '',
    date: '',
    timeSlot: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    const slots = generateTimeSlots(formData.date, formData.employee, serviceDuration);
    setAvailableTimeSlots(slots);
  }, [formData.service, formData.employee, formData.date, bookings, services]);

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

    // Get existing bookings for this employee on this date
    const employeeBookings = bookings.filter(b => {
      if (b.employee !== employeeId) return false;
      const bookingDate = new Date(b.date);
      // Compare dates by date string to avoid timezone issues
      const bookingDateStr = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
      const selectedDateStr = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
      return bookingDateStr === selectedDateStr;
    });

    // Generate slots from business hours
    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
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
        
        if (slotEndTime.getHours() >= BUSINESS_HOURS.end) {
          continue;
        }

        // Check if slot conflicts with existing bookings
        const isAvailable = !employeeBookings.some(booking => {
          const bookingTime = new Date(booking.date);
          const bookingEndTime = new Date(bookingTime);
          bookingEndTime.setMinutes(bookingEndTime.getMinutes() + (booking.duration || 45) + BUFFER_TIME);
          
          // Check if slots overlap
          return (slotDateTime >= bookingTime && slotDateTime < bookingEndTime) ||
                 (slotEndTime > bookingTime && slotEndTime <= bookingEndTime) ||
                 (slotDateTime <= bookingTime && slotEndTime >= bookingEndTime);
        });

        if (isAvailable) {
          slots.push(slotTime);
        }
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

    const selectedService = services.find(s => s.name === formData.service);
    const serviceDuration = schedulingMinutes(selectedService?.duration);

    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('phone', formData.phone);
    formDataObj.append('service', formData.service);
    formDataObj.append('employee', formData.employee);
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
        
        setSubmitted(true);
        setFormData({ name: '', phone: '', service: '', employee: '', date: '', timeSlot: '' });
        setAvailableTimeSlots([]);
        
        setTimeout(() => setSubmitted(false), 5000);
      }
    } catch (error) {
      console.error('Booking error:', error);
      alert('Failed to submit booking. Please try again.');
    }
  };

  const selectedService = services.find(s => s.name === formData.service);
  const selectedEmployee = employees.find(e => e.id === formData.employee);

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
      {/* Hero Section */}
      <section className="relative border-b border-champagne-400/35 bg-gradient-to-br from-champagne-50 via-stone-100 to-champagne-100 py-[0.525rem] overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-64 h-64 bg-champagne-300 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-champagne-200/50 rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10">
          <Breadcrumbs items={[{ label: 'Booking' }]} />
          <div className="text-center mb-[0.175rem] mt-[0.175rem]">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">Book an Appointment</h2>
            <PageHeroRule />
            <p className="text-sm text-gray-600 max-w-2xl mx-auto mt-[0.525rem]">
              Schedule your nail service with our expert technicians
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-10 border-t border-champagne-300/25">
      <div className="max-w-4xl mx-auto">
        
        {submitted && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            Thank you! Your booking has been submitted. We'll contact you soon.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg border border-champagne-300/45 bg-white p-6 shadow-md ring-1 ring-champagne-100/50"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone Number"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Service *</label>
            {services.length > 0 ? (
              <select
                name="service"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value, employee: '', date: '', timeSlot: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                required
              >
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name} - ${service.price.toFixed(2)}
                    {service.duration !== 0 ? ` (${schedulingMinutes(service.duration)} min)` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-gray-500 text-sm">No services available. Please contact us directly.</p>
            )}
            {selectedService && selectedService.duration !== 0 && (
              <p className="mt-1 text-xs text-gray-500">
                Duration: {schedulingMinutes(selectedService.duration)} minutes
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
            {availableEmployees.length > 0 ? (
              <select
                name="employee"
                value={formData.employee}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value, date: '', timeSlot: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-champagne-500 focus:border-champagne-500"
                required
                disabled={!formData.service}
              >
                <option value="">
                  {formData.service ? 'Select an employee' : 'Please select a service first'}
                </option>
                {availableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.role}
                  </option>
                ))}
              </select>
            ) : formData.service ? (
              <div className="px-4 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-yellow-700 text-sm">
                No employees available for this service. Please select a different service.
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Please select a service first</p>
            )}
            {selectedEmployee && (
              <p className="text-xs text-gray-500 mt-1">
                Role: {selectedEmployee.role}
              </p>
            )}
          </div>

          {formData.service && formData.employee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Date *</label>
              
              {/* Calendar */}
              <div className="border border-gray-200 rounded-lg overflow-hidden w-full max-w-md mx-auto">
                {/* Month Navigation */}
                <div className="bg-champagne-50 px-2 py-1.5 flex justify-between items-center border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigateMonth('prev')}
                    className="px-1.5 py-0.5 text-champagne-600 hover:bg-champagne-100 rounded transition text-xs"
                  >
                    ←
                  </button>
                  <h3 className="text-sm font-semibold text-gray-800">
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
                      <div key={idx} className="text-center text-[10px] font-semibold text-gray-600 py-0.5">
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
                              ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                              : isSelected
                              ? 'bg-champagne-600 text-white shadow-sm font-semibold'
                              : isTodayDate
                              ? 'bg-champagne-100 text-champagne-700 hover:bg-champagne-200 font-semibold border border-champagne-400'
                              : 'bg-white text-gray-700 hover:bg-champagne-50 hover:text-champagne-600 border border-gray-200'
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
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-champagne-600">✓</span> {formatDate(new Date(formData.date))}
                </div>
              )}
            </div>
          )}

          {formData.date && formData.service && formData.employee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Time *</label>
              
              {/* Time slots table - organized by hours */}
              {availableTimeSlots.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hour</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Available Times</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Group time slots by hour
                        const slotsByHour: Record<number, string[]> = {};
                        availableTimeSlots.forEach(slot => {
                          const hour = parseInt(slot.split(':')[0]);
                          if (!slotsByHour[hour]) {
                            slotsByHour[hour] = [];
                          }
                          slotsByHour[hour].push(slot);
                        });

                        return Object.keys(slotsByHour)
                          .map(Number)
                          .sort((a, b) => a - b)
                          .map(hour => (
                            <tr key={hour} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-semibold text-gray-700">
                                  {hour}:00
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {slotsByHour[hour].map((slot) => {
                                    const isSelected = formData.timeSlot === slot;
                                    return (
                                      <button
                                        key={slot}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, timeSlot: slot })}
                                        className={`
                                          px-3 py-1.5 rounded-md text-sm font-medium transition min-w-[60px]
                                          ${isSelected
                                            ? 'bg-champagne-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-champagne-100 hover:text-champagne-700 border border-gray-200'
                                          }
                                        `}
                                      >
                                        {slot}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-3 border border-red-300 bg-red-50 rounded-md text-red-700 text-sm">
                  No available time slots for this date. Please select a different date.
                </div>
              )}

              {formData.timeSlot && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-champagne-600">✓</span> {formData.timeSlot}
                  {selectedService?.duration !== 0 && (
                    <span> ({schedulingMinutes(selectedService?.duration)} min)</span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-champagne-500 text-white px-4 py-2 rounded-md hover:bg-champagne-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!formData.employee || !formData.service || !formData.date || !formData.timeSlot}
          >
            Book Now
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
