import {
  isBookingWindowBlocked,
  intervalsOverlapExclusiveEnd,
  overlapsSalonWideBookingWindow,
  overlapsStylistScopedBookingWindow,
} from '@/lib/bookingBlocks';
import type { CmsBookingBlock } from '@/lib/cmsSiteTypes';
import {
  bookingServiceStaffFamily,
  employeeCanPerformService,
} from '@/lib/booking/serviceEmployeeMatch';
import {
  salonAppointmentDate,
  salonDateTimeToUtc,
  salonTimeSlotLabel,
} from '@/lib/db/timezone';

export type SlotBooking = {
  id: string;
  service: string;
  employee?: string | null;
  date: string;
  timeSlot: string;
  duration?: number;
};

export type SlotEmployee = {
  id: string;
  role: string;
};

export type SlotService = {
  name: string;
  category?: string | null;
  duration?: number;
};

export type SlotState = 'open' | 'salon_blocked' | 'staff_blocked' | 'fully_booked';

type BookingInterval = { start: Date; end: Date };

function localDayKey(d: Date): string {
  return salonAppointmentDate(d);
}

function bookingDurationMinutes(booking: SlotBooking): number {
  const raw = booking.duration;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 45;
}

/**
 * Start/end for a booking row (half-open end).
 * Prefers the absolute ISO on `date` (Postgres/CMS); otherwise salon wall clock from YYYY-MM-DD + timeSlot.
 * Never uses `new Date(y, m, d, h, min)` — that breaks capacity checks on UTC servers.
 */
export function parseBookingInterval(booking: SlotBooking, bufferMinutes = 0): BookingInterval | null {
  let start: Date | null = null;

  if (typeof booking.date === 'string' && booking.date.includes('T')) {
    const fromIso = new Date(booking.date);
    if (Number.isFinite(fromIso.getTime())) start = fromIso;
  }

  if (!start) {
    let dateYmd: string | null = null;
    if (typeof booking.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(booking.date)) {
      dateYmd = booking.date;
    } else if (booking.date) {
      const base = new Date(booking.date);
      if (Number.isFinite(base.getTime())) dateYmd = salonAppointmentDate(base);
    }
    const t = (booking.timeSlot || '').trim();
    if (dateYmd && t) {
      start = salonDateTimeToUtc(dateYmd, t);
    }
  }

  if (!start) return null;

  const end = new Date(start.getTime());
  end.setMinutes(end.getMinutes() + bookingDurationMinutes(booking) + bufferMinutes);
  return { start, end };
}

function intervalsOverlap(a: BookingInterval, b: BookingInterval): boolean {
  return intervalsOverlapExclusiveEnd(
    a.start.getTime(),
    a.end.getTime(),
    b.start.getTime(),
    b.end.getTime(),
  );
}

function resolveService(serviceName: string, catalog: SlotService[]): SlotService {
  const trimmed = String(serviceName ?? '').trim();
  const match = catalog.find((s) => String(s.name ?? '').trim() === trimmed);
  return match ?? { name: trimmed, category: '' };
}

function employeeBusyIntervals(
  employeeId: string,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): BookingInterval[] {
  return intervalsByEmployee.get(employeeId) ?? [];
}

function addBusyInterval(
  employeeId: string,
  interval: BookingInterval,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): void {
  const list = intervalsByEmployee.get(employeeId) ?? [];
  list.push(interval);
  intervalsByEmployee.set(employeeId, list);
}

function isEmployeeFreeForInterval(
  employeeId: string,
  interval: BookingInterval,
  intervalsByEmployee: Map<string, BookingInterval[]>,
): boolean {
  return !employeeBusyIntervals(employeeId, intervalsByEmployee).some((busy) =>
    intervalsOverlap(busy, interval),
  );
}

/** Prefer Water/Powder specialists over Everything when simulating unassigned placement. */
function specialistFirstRank(employee: SlotEmployee, service: SlotService): number {
  const role = String(employee.role ?? '')
    .trim()
    .toLowerCase();
  const family = bookingServiceStaffFamily(service);
  if (family === 'water') {
    if (role === 'water') return 0;
    if (role === 'everything') return 1;
    return 2;
  }
  if (family === 'powder') {
    if (role === 'powder' || role === 'acrylic' || role === 'power') return 0;
    if (role === 'everything') return 1;
    return 2;
  }
  if (role === 'everything') return 1;
  return 0;
}

/** When start times tie, assign powder-family work before water so Everything is not consumed by pedis before Gel X. */
function unassignedProcessingRank(booking: SlotBooking, services: SlotService[]): number {
  const family = bookingServiceStaffFamily(resolveService(booking.service, services));
  if (family === 'powder') return 0;
  if (family === 'water') return 1;
  return 2;
}

/**
 * Greedy assignment: assigned bookings lock their stylist; each unassigned booking
 * must map to a distinct qualified, unblocked employee for its window.
 */
export function canAssignOverlappingBookings(opts: {
  bookings: SlotBooking[];
  employees: SlotEmployee[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  dateYmd: string;
  bufferMinutes?: number;
}): boolean {
  const { bookings, employees, services, blocks, dateYmd, bufferMinutes = 0 } = opts;
  if (bookings.length === 0) return true;

  const intervalsByEmployee = new Map<string, BookingInterval[]>();
  const assigned: Array<{ booking: SlotBooking; interval: BookingInterval }> = [];
  const unassigned: Array<{ booking: SlotBooking; interval: BookingInterval }> = [];

  for (const booking of bookings) {
    const interval = parseBookingInterval(booking, bufferMinutes);
    if (!interval) continue;
    if (localDayKey(interval.start) !== dateYmd) continue;

    const empId = String(booking.employee ?? '').trim();
    if (empId) {
      assigned.push({ booking, interval });
    } else {
      unassigned.push({ booking, interval });
    }
  }

  for (const { booking, interval } of assigned) {
    const empId = String(booking.employee ?? '').trim();
    const svc = resolveService(booking.service, services);
    const employee = employees.find((e) => e.id === empId);
    // Orphan / legacy rows should not block the whole calendar.
    if (!employee || !employeeCanPerformService(employee, svc)) continue;
    if (
      isBookingWindowBlocked({
        dateYmd,
        employeeId: empId,
        slotStartLocal: interval.start,
        slotEndExclusiveLocal: interval.end,
        blocks,
      })
    ) {
      return false;
    }
    if (!isEmployeeFreeForInterval(empId, interval, intervalsByEmployee)) return false;
    addBusyInterval(empId, interval, intervalsByEmployee);
  }

  unassigned.sort((a, b) => {
    const byStart = a.interval.start.getTime() - b.interval.start.getTime();
    if (byStart !== 0) return byStart;
    return (
      unassignedProcessingRank(a.booking, services) -
      unassignedProcessingRank(b.booking, services)
    );
  });

  for (const { booking, interval } of unassigned) {
    const svc = resolveService(booking.service, services);
    const candidates = employees.filter((employee) => {
      if (!employeeCanPerformService(employee, svc)) return false;
      if (
        isBookingWindowBlocked({
          dateYmd,
          employeeId: employee.id,
          slotStartLocal: interval.start,
          slotEndExclusiveLocal: interval.end,
          blocks,
        })
      ) {
        return false;
      }
      return isEmployeeFreeForInterval(employee.id, interval, intervalsByEmployee);
    });

    if (candidates.length === 0) return false;
    candidates.sort(
      (a, b) => specialistFirstRank(a, svc) - specialistFirstRank(b, svc),
    );
    addBusyInterval(candidates[0].id, interval, intervalsByEmployee);
  }

  return true;
}

export function bookingsOverlappingWindow(
  bookings: SlotBooking[],
  slotStart: Date,
  slotEndExclusive: Date,
  dateYmd: string,
  bufferMinutes = 0,
): SlotBooking[] {
  const window: BookingInterval = { start: slotStart, end: slotEndExclusive };
  return bookings.filter((booking) => {
    const interval = parseBookingInterval(booking, bufferMinutes);
    if (!interval) return false;
    if (localDayKey(interval.start) !== dateYmd) return false;
    return intervalsOverlap(interval, window);
  });
}

export function evaluateSlotState(opts: {
  dateYmd: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  service: SlotService;
  employees: SlotEmployee[];
  bookings: SlotBooking[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  bufferMinutes?: number;
  /** When set, the guest chose a specific stylist (stored on the booking). */
  stylistId?: string;
  /** Exclude an existing booking id when re-validating (future edits). */
  excludeBookingId?: string;
}): SlotState {
  const {
    dateYmd,
    slotStartLocal,
    slotEndExclusiveLocal,
    service,
    employees,
    bookings,
    services,
    blocks,
    bufferMinutes = 0,
    stylistId,
    excludeBookingId,
  } = opts;

  if (
    overlapsSalonWideBookingWindow({
      dateYmd,
      slotStartLocal,
      slotEndExclusiveLocal,
      blocks,
    })
  ) {
    return 'salon_blocked';
  }

  const stylist = stylistId?.trim() ?? '';
  if (stylist) {
    const employee = employees.find((e) => e.id === stylist);
    if (!employee || !employeeCanPerformService(employee, service)) {
      return 'fully_booked';
    }
    if (
      overlapsStylistScopedBookingWindow({
        dateYmd,
        employeeId: stylist,
        slotStartLocal,
        slotEndExclusiveLocal,
        blocks,
      })
    ) {
      return 'staff_blocked';
    }
  }

  const overlapping = bookingsOverlappingWindow(
    bookings.filter((b) => b.id !== excludeBookingId),
    slotStartLocal,
    slotEndExclusiveLocal,
    dateYmd,
    bufferMinutes,
  );

  // Simulate assigning every overlapping appointment (all families share the same staff pool).
  const candidate: SlotBooking = {
    id: '__candidate__',
    service: service.name,
    employee: stylist || undefined,
    date: dateYmd,
    timeSlot: salonTimeSlotLabel(slotStartLocal),
    duration: service.duration,
  };

  const ok = canAssignOverlappingBookings({
    bookings: [...overlapping, candidate],
    employees,
    services,
    blocks,
    dateYmd,
    bufferMinutes,
  });

  return ok ? 'open' : 'fully_booked';
}

/** True when a new booking may be saved (server + client submit). */
export function hasBookingCapacity(opts: {
  dateYmd: string;
  slotStartLocal: Date;
  slotEndExclusiveLocal: Date;
  service: SlotService;
  employees: SlotEmployee[];
  bookings: SlotBooking[];
  services: SlotService[];
  blocks: CmsBookingBlock[];
  bufferMinutes?: number;
  stylistId?: string;
  excludeBookingId?: string;
}): boolean {
  return (
    evaluateSlotState(opts) === 'open'
  );
}
